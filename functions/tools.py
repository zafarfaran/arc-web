# ========================================
# AI Tools - Context-Aware LLM Function Calling
# ========================================

from firebase_admin import firestore
from datetime import datetime, timedelta
from typing import Any, Optional
import json

# Lazy initialization of Firestore client
_db = None

def get_db():
    """Get Firestore client, initializing on first use."""
    global _db
    if _db is None:
        _db = firestore.client()
    return _db

# ========================================
# TOOL DEFINITIONS (OpenAI Function Calling Schema)
# ========================================

TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "get_user_profile",
            "description": "Get the current user's profile including name, rank, XP, and preferences. Use this when the user asks about their account, rank, or progress.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_todos",
            "description": "Get the user's todos/tasks. Can filter by status, priority, or due date. Use this when users ask about their tasks, to-dos, what's due, or what they need to do.",
            "parameters": {
                "type": "object",
                "properties": {
                    "status": {
                        "type": "string",
                        "enum": ["all", "active", "completed"],
                        "description": "Filter by completion status. 'active' means not completed."
                    },
                    "priority": {
                        "type": "string",
                        "enum": ["high", "medium", "low"],
                        "description": "Filter by priority level"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of todos to return (default: 20, max: 50)"
                    },
                    "due_date_start": {
                        "type": "string",
                        "description": "Filter todos due ON or AFTER this date (YYYY-MM-DD)."
                    },
                    "due_date_end": {
                        "type": "string",
                        "description": "Filter todos due ON or BEFORE this date (YYYY-MM-DD). For 'overdue', set this to yesterday's date."
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_habits",
            "description": "Get the user's habits with streak information and today's completion status. Use this when users ask about their habits, streaks, or daily routines.",
            "parameters": {
                "type": "object",
                "properties": {
                    "status": {
                        "type": "string",
                        "enum": ["all", "completed", "pending"],
                        "description": "Filter habits for today. 'completed' = finished today, 'pending' = needs checking in today."
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_goals",
            "description": "Get the user's goals with progress and milestones. Use this when users ask about their goals, objectives, or long-term progress.",
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {
                        "type": "string",
                        "enum": ["financial", "social", "fitness", "learning", "career", "personal"],
                        "description": "Filter goals by category"
                    },
                    "include_completed": {
                        "type": "boolean",
                        "description": "Whether to include completed goals (default: false)"
                    },
                    "deadline_start": {
                        "type": "string",
                        "description": "Filter goals due ON or AFTER this date (YYYY-MM-DD)."
                    },
                    "deadline_end": {
                        "type": "string",
                        "description": "Filter goals due ON or BEFORE this date (YYYY-MM-DD). For 'overdue', set this to yesterday's date."
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_focus_summary",
            "description": "Get summary of focus sessions and productivity stats. Use this when users ask about their focus time, productivity, or work sessions.",
            "parameters": {
                "type": "object",
                "properties": {
                    "period": {
                        "type": "string",
                        "enum": ["today", "week", "month", "all"],
                        "description": "Time period for the summary (default: week)"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "add_todo",
            "description": "Create a new todo/task for the user. Use this when users want to add, create, or remember something to do.",
            "parameters": {
                "type": "object",
                "properties": {
                    "text": {
                        "type": "string",
                        "description": "The todo text/description"
                    },
                    "priority": {
                        "type": "string",
                        "enum": ["high", "medium", "low"],
                        "description": "Priority level (default: medium)"
                    },
                    "due_date": {
                        "type": "string",
                        "description": "Due date in YYYY-MM-DD format (optional)"
                    }
                },
                "required": ["text"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "complete_todo",
            "description": "Mark a todo as completed. Use this when users say they've done something or want to check off a task.",
            "parameters": {
                "type": "object",
                "properties": {
                    "todo_id": {
                        "type": "string",
                        "description": "The ID of the todo to complete"
                    },
                    "todo_text": {
                        "type": "string",
                        "description": "Partial text match to find the todo (if ID not known)"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "toggle_habit",
            "description": "Mark a habit as complete or incomplete for today. Use this when users say they've done their habit or want to log it.",
            "parameters": {
                "type": "object",
                "properties": {
                    "habit_id": {
                        "type": "string",
                        "description": "The ID of the habit to toggle"
                    },
                    "habit_name": {
                        "type": "string",
                        "description": "Partial name match to find the habit (if ID not known)"
                    },
                    "date": {
                        "type": "string",
                        "description": "Date in YYYY-MM-DD format (default: today)"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "update_goal_progress",
            "description": "Update progress on a trackable goal. Use this when users report progress on numeric goals.",
            "parameters": {
                "type": "object",
                "properties": {
                    "goal_id": {
                        "type": "string",
                        "description": "The ID of the goal to update"
                    },
                    "goal_name": {
                        "type": "string",
                        "description": "Partial name match to find the goal (if ID not known)"
                    },
                    "value": {
                        "type": "number",
                        "description": "The new current value OR the increment amount"
                    },
                    "is_increment": {
                        "type": "boolean",
                        "description": "If true, add value to current. If false, set as new value (default: true)"
                    }
                },
                "required": ["value"]
            }
        }
    }
]


# ========================================
# TOOL HANDLERS
# ========================================

def get_user_profile(user_id: str, params: dict) -> dict:
    """Fetch user profile with XP and rank info."""
    try:
        user_ref = get_db().collection('users').document(user_id)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            return {"error": "User profile not found"}
        
        data = user_doc.to_dict()
        xp_data = data.get('xp', {})
        
        return {
            "name": data.get('name', 'User'),
            "email": data.get('email', ''),
            "rank": xp_data.get('rank', 'novice'),
            "total_xp": xp_data.get('totalXp', 0),
            "is_pro": data.get('isPro', False),
        }
    except Exception as e:
        return {"error": str(e)}


def get_todos(user_id: str, params: dict) -> dict:
    """Fetch user's todos with optional filters including due date."""
    try:
        todos_ref = get_db().collection('users').document(user_id).collection('todos')
        # Fetch more than requested to check if there are more
        requested_limit = min(params.get('limit', 20), 50)
        fetch_limit = requested_limit + 1  # Fetch one extra to detect if there are more
        
        docs = todos_ref.order_by('createdAt', direction=firestore.Query.DESCENDING).limit(fetch_limit * 2).stream()
        todos = []
        
        # Date filtering parameters
        start_date = params.get('due_date_start')
        end_date = params.get('due_date_end')
        
        # Parse date strings to datetime objects
        start_dt = None
        end_dt = None
        
        if start_date:
            try:
                # Naive start of day
                start_dt = datetime.strptime(start_date, '%Y-%m-%d')
            except ValueError:
                pass

        if end_date:
            try:
                # Naive end of day
                end_dt = datetime.strptime(end_date, '%Y-%m-%d').replace(hour=23, minute=59, second=59)
            except ValueError:
                pass
        
        for doc in docs:
            data = doc.to_dict()
            
            # Apply status filter
            status = params.get('status')
            if status == 'active' and data.get('completed', False):
                continue
            if status == 'completed' and not data.get('completed', False):
                continue
            
            # Apply priority filter
            priority = params.get('priority')
            if priority and data.get('priority') != priority:
                continue

            # Apply search filter
            search_term = params.get('search')
            if search_term and search_term.lower() not in data.get('text', '').lower():
                continue
            
            # Apply IDs filter (Strict selection)
            target_ids = params.get('ids')
            if target_ids and isinstance(target_ids, list) and doc.id not in target_ids:
                continue

            # Apply Titles filter (Strict selection)
            target_titles = params.get('titles')
            if target_titles and isinstance(target_titles, list):
                # Check if ANY title in the list matches the text
                text_lower = data.get('text', '').lower()
                matched = False
                for t in target_titles:
                    if t.lower() in text_lower:
                        matched = True
                        break
                if not matched:
                    continue

            # Apply due date range filter
            due_date = data.get('dueDate')
            due_dt = None
            
            if due_date:
                # Handle Firestore Timestamp (datetime) or String (ISO)
                if isinstance(due_date, datetime):
                    # Make naive for safe comparison with start_dt/end_dt
                    due_dt = due_date.replace(tzinfo=None)
                elif isinstance(due_date, str):
                    try:
                        # Attempt to parse ISO string
                        # Handle potential 'Z' or offset if present, but for now simplistic:
                        # splitting 'T' is safest if pure ISO
                        date_part = due_date.split('T')[0]
                        due_dt = datetime.strptime(date_part, '%Y-%m-%d') 
                    except ValueError:
                        pass
            
            if start_dt or end_dt:
                if not due_dt:
                    continue # Skip if no due date but range filter is active
                
                if start_dt and due_dt < start_dt:
                    continue
                if end_dt and due_dt > end_dt:
                    continue
            
            # Defensively allow tags to be non-string (convert to string if so)
            raw_tags = data.get('tags', [])
            safe_tags = []
            if isinstance(raw_tags, list):
                for t in raw_tags:
                    if isinstance(t, str):
                        safe_tags.append(t)
                    elif isinstance(t, dict) and 'name' in t:
                        safe_tags.append(str(t['name']))
                    else:
                        safe_tags.append(str(t))

            todos.append({
                "id": doc.id,
                "text": data.get('text', ''),
                "completed": data.get('completed', False),
                "priority": data.get('priority', 'medium'),
                "due_date": due_date.isoformat() if isinstance(due_date, datetime) else str(due_date) if due_date else None,
                "tags": safe_tags
            })
            
            # Stop if we have enough (plus one for has_more check)
            if len(todos) >= fetch_limit:
                break
        
        # Check if there are more results
        has_more = len(todos) > requested_limit
        if has_more:
            todos = todos[:requested_limit]
        
        return {
            "todos": todos,
            "count": len(todos),
            "has_more": has_more,
            "filters_applied": {k: v for k, v in params.items() if v is not None}
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Error in get_todos: {e}")
        return {"error": str(e)}


def get_habits(user_id: str, params: dict) -> dict:
    """Fetch user's habits with streak info."""
    try:
        habits_ref = get_db().collection('users').document(user_id).collection('habits')
        docs = habits_ref.stream()
        
        today = datetime.now().strftime('%Y-%m-%d')
        habits = []
        
        for doc in docs:
            data = doc.to_dict()
            completed_dates = data.get('completedDates', [])
            completed_today = today in completed_dates
            
            # Apply filter
            status_filter = params.get('status', 'all')
            if status_filter == 'completed' and not completed_today:
                continue
            if status_filter == 'pending' and completed_today:
                continue
            
            habits.append({
                "id": doc.id,
                "name": data.get('name', ''),
                "icon": data.get('icon', ''),
                "streak_count": data.get('streakCount', 0),
                "completed_today": completed_today,
                "target_days": data.get('targetDays', []),
                "tags": data.get('tags', []),
                "color": data.get('color', '#3B82F6')
            })
        
        return {
            "habits": habits,
            "count": len(habits),
            "date": today
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Error in get_habits: {e}")
        return {"error": str(e)}


def get_goals(user_id: str, params: dict) -> dict:
    """Fetch user's goals with progress."""
    try:
        goals_ref = get_db().collection('users').document(user_id).collection('goals')
        docs = goals_ref.stream()
        
        goals = []
        
        # Date filtering parameters
        deadline_start = params.get('deadline_start')
        deadline_end = params.get('deadline_end')
        
        # Parse date strings to datetime objects
        start_dt = None
        end_dt = None
        
        if deadline_start:
            try:
                start_dt = datetime.strptime(deadline_start, '%Y-%m-%d')
            except ValueError:
                pass # Ignore invalid format
                
        if deadline_end:
            try:
                # Set to end of day
                end_dt = datetime.strptime(deadline_end, '%Y-%m-%d').replace(hour=23, minute=59, second=59)
            except ValueError:
                pass

        for doc in docs:
            data = doc.to_dict()
            
            # Check if completed
            is_completed = data.get('completedAt') is not None
            if not params.get('include_completed', False) and is_completed:
                continue
            
            # Apply category filter
            category = params.get('category')
            if category and data.get('category') != category:
                continue
            
            # Apply search filter
            search_term = params.get('search')
            if search_term:
                name = data.get('name', '').lower()
                desc = data.get('description', '').lower()
                q = search_term.lower()
                if q not in name and q not in desc:
                    continue

            # Apply IDs filter (Strict selection)
            target_ids = params.get('ids')
            if target_ids and isinstance(target_ids, list) and doc.id not in target_ids:
                continue

            # Apply Titles filter (Strict selection)
            target_titles = params.get('titles')
            if target_titles and isinstance(target_titles, list):
                # Check if ANY title in the list matches name
                name_lower = data.get('name', '').lower()
                matched = False
                for t in target_titles:
                    if t.lower() in name_lower:
                        matched = True
                        break
                if not matched:
                    continue

            # Check deadline filter
            deadline = data.get('deadline')
            deadline_dt = None
            if deadline and isinstance(deadline, datetime):
                deadline_dt = deadline.replace(tzinfo=None) if deadline.tzinfo else deadline
            
            # Apply date range filter
            if start_dt or end_dt:
                if not deadline_dt:
                    continue # Skip if no deadline but range filter is active
                
                if start_dt and deadline_dt < start_dt:
                    continue
                if end_dt and deadline_dt > end_dt:
                    continue

            goal_type = data.get('goalType', 'trackable')
            
            goal_info = {
                "id": doc.id,
                "name": data.get('name', ''),
                "description": data.get('description', ''),
                "goal_type": goal_type,
                "category": data.get('category', 'personal'),
                "is_completed": is_completed,
                "deadline": deadline.isoformat() if deadline else None,
                "color": data.get('color', '#3B82F6'),
                "icon": data.get('icon', 'Target'),
                "tags": data.get('tags', []),
                "created_at": data.get('createdAt').isoformat() if data.get('createdAt') else None
            }
            
            if goal_type == 'trackable':
                current = data.get('currentValue', 0)
                target = data.get('targetValue', 1)
                goal_info.update({
                    "current_value": current,
                    "target_value": target,
                    "starting_value": data.get('startingValue', 0),
                    "target_direction": data.get('targetDirection', 'increase'),
                    "unit": data.get('unit', ''),
                    "progress_percent": round((current / target) * 100, 1) if target > 0 else 0
                })
            else:
                milestones = data.get('milestones', [])
                # Sanitize milestones dates
                sanitized_milestones = []
                for m in milestones:
                    m_copy = m.copy()
                    c_at = m_copy.get('completedAt')
                    if c_at and hasattr(c_at, 'isoformat'):
                        m_copy['completedAt'] = c_at.isoformat()
                    sanitized_milestones.append(m_copy)
                
                completed_count = sum(1 for m in sanitized_milestones if m.get('completed', False))
                goal_info.update({
                    "milestones": sanitized_milestones,
                    "milestones_completed": completed_count,
                    "milestones_total": len(sanitized_milestones)
                })
            
            goals.append(goal_info)
        
        return {
            "goals": goals,
            "count": len(goals)
        }
    except Exception as e:
        return {"error": str(e)}


def get_focus_summary(user_id: str, params: dict) -> dict:
    """Get focus session summary and stats."""
    try:
        sessions_ref = get_db().collection('users').document(user_id).collection('sessions')
        period = params.get('period', 'week')
        
        # Calculate date range
        now = datetime.now()
        if period == 'today':
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == 'week':
            start_date = now - timedelta(days=7)
        elif period == 'month':
            start_date = now - timedelta(days=30)
        else:
            start_date = None
        
        query = sessions_ref.where('status', '==', 'completed').where('mode', '==', 'focus')
        if start_date:
            query = query.where('startedAt', '>=', start_date)
        
        docs = query.stream()
        
        total_minutes = 0
        session_count = 0
        tags_count = {}
        
        for doc in docs:
            data = doc.to_dict()
            duration = data.get('actualDuration', data.get('duration', 0))
            total_minutes += duration / 60
            session_count += 1
            
            for tag in data.get('tags', []):
                tags_count[tag] = tags_count.get(tag, 0) + 1
        
        return {
            "period": period,
            "total_focus_minutes": round(total_minutes, 1),
            "total_focus_hours": round(total_minutes / 60, 1),
            "session_count": session_count,
            "avg_session_minutes": round(total_minutes / session_count, 1) if session_count > 0 else 0,
            "top_tags": sorted(tags_count.items(), key=lambda x: x[1], reverse=True)[:5]
        }
    except Exception as e:
        return {"error": str(e)}


def add_todo(user_id: str, params: dict) -> dict:
    """Create a new todo."""
    try:
        text = params.get('text')
        if not text:
            return {"error": "Todo text is required"}
        
        todos_ref = get_db().collection('users').document(user_id).collection('todos')
        
        new_todo = {
            "text": text,
            "completed": False,
            "priority": params.get('priority', 'medium'),
            "createdAt": firestore.SERVER_TIMESTAMP,
            "tags": []
        }
        
        # Parse due date if provided
        due_date = params.get('due_date')
        if due_date:
            try:
                new_todo['dueDate'] = datetime.strptime(due_date, '%Y-%m-%d')
            except ValueError:
                pass  # Ignore invalid date format
        
        doc_ref = todos_ref.add(new_todo)
        
        return {
            "success": True,
            "todo_id": doc_ref[1].id,
            "message": f"Created todo: '{text}'"
        }
    except Exception as e:
        return {"error": str(e)}


def complete_todo(user_id: str, params: dict) -> dict:
    """Mark a todo as completed."""
    try:
        todo_id = params.get('todo_id')
        todo_text = params.get('todo_text')
        
        todos_ref = get_db().collection('users').document(user_id).collection('todos')
        
        # Find todo by ID or text match
        if todo_id:
            doc_ref = todos_ref.document(todo_id)
            doc = doc_ref.get()
            if not doc.exists:
                return {"error": f"Todo with ID '{todo_id}' not found"}
        elif todo_text:
            # Search by partial text match
            docs = todos_ref.where('completed', '==', False).stream()
            matching_doc = None
            for doc in docs:
                if todo_text.lower() in doc.to_dict().get('text', '').lower():
                    matching_doc = doc
                    break
            
            if not matching_doc:
                return {"error": f"No active todo matching '{todo_text}' found"}
            doc_ref = todos_ref.document(matching_doc.id)
            doc = matching_doc
        else:
            return {"error": "Either todo_id or todo_text is required"}
        
        # Update the todo
        doc_ref.update({
            "completed": True,
            "completedAt": firestore.SERVER_TIMESTAMP
        })
        
        return {
            "success": True,
            "todo_id": doc_ref.id,
            "message": f"Completed: '{doc.to_dict().get('text', '')}'"
        }
    except Exception as e:
        return {"error": str(e)}


def toggle_habit(user_id: str, params: dict) -> dict:
    """Toggle habit completion for a date."""
    try:
        habit_id = params.get('habit_id')
        habit_name = params.get('habit_name')
        date = params.get('date', datetime.now().strftime('%Y-%m-%d'))
        
        habits_ref = get_db().collection('users').document(user_id).collection('habits')
        
        # Find habit by ID or name match
        if habit_id:
            doc_ref = habits_ref.document(habit_id)
            doc = doc_ref.get()
            if not doc.exists:
                return {"error": f"Habit with ID '{habit_id}' not found"}
        elif habit_name:
            docs = list(habits_ref.stream())
            matching_doc = None
            for doc in docs:
                if habit_name.lower() in doc.to_dict().get('name', '').lower():
                    matching_doc = doc
                    break
            
            if not matching_doc:
                return {"error": f"No habit matching '{habit_name}' found"}
            doc_ref = habits_ref.document(matching_doc.id)
            doc = matching_doc
        else:
            return {"error": "Either habit_id or habit_name is required"}
        
        # Toggle the date in completedDates
        data = doc.to_dict()
        completed_dates = data.get('completedDates', [])
        
        if date in completed_dates:
            completed_dates.remove(date)
            action = "unmarked"
        else:
            completed_dates.append(date)
            action = "marked complete"
        
        # Recalculate streak (simplified - just count consecutive days from today)
        streak = 0
        check_date = datetime.now()
        while check_date.strftime('%Y-%m-%d') in completed_dates:
            streak += 1
            check_date -= timedelta(days=1)
        
        doc_ref.update({
            "completedDates": completed_dates,
            "streakCount": streak
        })
        
        return {
            "success": True,
            "habit_id": doc_ref.id,
            "habit_name": data.get('name', ''),
            "action": action,
            "date": date,
            "new_streak": streak
        }
    except Exception as e:
        return {"error": str(e)}


def update_goal_progress(user_id: str, params: dict) -> dict:
    """Update progress on a trackable goal."""
    try:
        goal_id = params.get('goal_id')
        goal_name = params.get('goal_name')
        value = params.get('value')
        is_increment = params.get('is_increment', True)
        
        if value is None:
            return {"error": "Value is required"}
        
        goals_ref = get_db().collection('users').document(user_id).collection('goals')
        
        # Find goal by ID or name match
        if goal_id:
            doc_ref = goals_ref.document(goal_id)
            doc = doc_ref.get()
            if not doc.exists:
                return {"error": f"Goal with ID '{goal_id}' not found"}
        elif goal_name:
            docs = list(goals_ref.stream())
            matching_doc = None
            for doc in docs:
                if goal_name.lower() in doc.to_dict().get('name', '').lower():
                    matching_doc = doc
                    break
            
            if not matching_doc:
                return {"error": f"No goal matching '{goal_name}' found"}
            doc_ref = goals_ref.document(matching_doc.id)
            doc = matching_doc
        else:
            return {"error": "Either goal_id or goal_name is required"}
        
        data = doc.to_dict()
        
        if data.get('goalType') != 'trackable':
            return {"error": "This goal is milestone-based, not trackable"}
        
        current_value = data.get('currentValue', 0)
        target_value = data.get('targetValue', 1)
        
        if is_increment:
            new_value = current_value + value
        else:
            new_value = value
        
        # Check if goal is now complete
        is_complete = new_value >= target_value
        
        update_data = {"currentValue": new_value}
        if is_complete and not data.get('completedAt'):
            update_data["completedAt"] = firestore.SERVER_TIMESTAMP
        
        doc_ref.update(update_data)
        
        return {
            "success": True,
            "goal_id": doc_ref.id,
            "goal_name": data.get('name', ''),
            "previous_value": current_value,
            "new_value": new_value,
            "target_value": target_value,
            "unit": data.get('unit', ''),
            "progress_percent": round((new_value / target_value) * 100, 1) if target_value > 0 else 0,
            "is_complete": is_complete
        }
    except Exception as e:
        return {"error": str(e)}


# ========================================
# TOOL ROUTER
# ========================================

TOOL_HANDLERS = {
    "get_user_profile": get_user_profile,
    "get_todos": get_todos,
    "get_habits": get_habits,
    "get_goals": get_goals,
    "get_focus_summary": get_focus_summary,
    "add_todo": add_todo,
    "complete_todo": complete_todo,
    "toggle_habit": toggle_habit,
    "update_goal_progress": update_goal_progress,
}


def execute_tool(tool_name: str, user_id: str, arguments: dict) -> dict:
    """Execute a tool by name with the given arguments."""
    handler = TOOL_HANDLERS.get(tool_name)
    if not handler:
        return {"error": f"Unknown tool: {tool_name}"}
    
    return handler(user_id, arguments)
