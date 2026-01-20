from firebase_functions import https_fn, options
from firebase_functions.params import SecretParam
from firebase_admin import initialize_app
from openai import OpenAI
import logging
import json
import datetime
from typing import List, Any, Dict

initialize_app()

# Import tool definitions and handlers
from tools import TOOL_DEFINITIONS, execute_tool
from prompts import PLANNER_PROMPT, RESPONDER_PROMPT

# Define the secret so the function can access it
OPENAI_API_KEY = SecretParam("OPENAI_API_KEY")

@https_fn.on_call(
    secrets=[OPENAI_API_KEY],
    cors=options.CorsOptions(
        cors_origins=[r"http://localhost:\d+", "https://arcascend-app.web.app", "https://arcascend-app.firebaseapp.com"],
        cors_methods=["post", "options"]
    ),
    invoker="public"
)
def chatWithAI(req: https_fn.CallableRequest) -> any:
    """
    Cloud Function to interact with OpenAI API with function calling.
    Must be called while authenticated.
    """
    # 1. Basic Auth check
    if not req.auth:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.UNAUTHENTICATED,
            message="The function must be called while authenticated."
        )

    user_id = req.auth.uid
    messages = req.data.get("messages")

    if not messages or not isinstance(messages, list):
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="The function must be called with a 'messages' array."
        )

    try:
        client = OpenAI(api_key=OPENAI_API_KEY.value)
        
        # Get latest user message for context detection
        last_user_msg = ""
        # iterate backwards to find last user message
        for m in reversed(messages):
            if m.get('role') == 'user':
                last_user_msg = m.get('content', "")
                break
        
        print(f"[AI-DEBUG] 🟢 Request Start | User: {user_id} | Msg: {last_user_msg[:50]}...")
        
        # ======================================================================
        # PHASE 1: PLANNER (Reasoning & Tool Selection)
        # ======================================================================
        
        # Inject today's date context into the planner prompt
        today_str = datetime.date.today().isoformat()
        planner_system_msg = f"{PLANNER_PROMPT}\n\nSYSTEM_DATE: {today_str}"
        
        print(f"[AI-DEBUG] 🧠 Planner Phase | Date: {today_str}")
        
        planner_messages = [
            {"role": "system", "content": planner_system_msg}
        ] + messages # Append full conversation history so planner knows context
        
        planner_response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=planner_messages,
            response_format={"type": "json_object"},
            temperature=0  # Deterministic planning
        )
        
        plan_json = planner_response.choices[0].message.content
        print(f"[AI-DEBUG] 🧠 Planner Output JSON:\n{plan_json}")
        
        try:
            plan = json.loads(plan_json)
        except json.JSONDecodeError:
            # Fallback if valid JSON isn't returned
            plan = {"reasoning": "Failed to parse plan", "tools": []}
            print(f"[AI-DEBUG] ❌ Planner JSON Error: {plan_json}")
            logging.error(f"Planner JSON error: {plan_json}")

        # ======================================================================
        # PHASE 2: EXECUTOR (Run Tools)
        # ======================================================================
        
        tool_results = []
        tools_to_run = plan.get("tools", [])
        
        if not tools_to_run:
            print("[AI-DEBUG] 🛠️ No tools to execute.")
        
        for tool in tools_to_run:
            name = tool.get("name")
            args = tool.get("arguments", {})
            
            try:
                # Execute the tool safely
                # Ensure args is a dictionary
                if isinstance(args, str):
                    args = json.loads(args)
                    
                print(f"[AI-DEBUG] 🛠️ Executing: {name} | Args: {args}")
                    
                result = execute_tool(name, user_id, args)
                
                print(f"[AI-DEBUG] ✅ Tool Result ({name}): {str(result)[:100]}...")
                
                # Structure the result for the specific UI format if needed
                # But here we just gather raw data for the Responder
                tool_results.append({
                    "tool": name,
                    "data": result
                })
            except Exception as e:
                print(f"[AI-DEBUG] ❌ Tool Error ({name}): {e}")
                logging.error(f"Tool execution error {name}: {e}")
                tool_results.append({
                    "tool": name,
                    "error": str(e)
                })

        # ======================================================================
        # PHASE 3: RESPONDER (Final Answer)
        # ======================================================================
        
        # context for responder
        responder_context = f"""
        PLANNER REASONING: {plan.get('reasoning')}
        TIME CONTEXT: {json.dumps(plan.get('time_context', {}))}
        TOOL RESULTS: {json.dumps(tool_results)}
        """
        
        print(f"[AI-DEBUG] 🗣️ Responder Phase | Reasoning: {plan.get('reasoning')}")
        
        responder_messages = [
            {"role": "system", "content": RESPONDER_PROMPT}
        ] + messages + [
            {"role": "system", "content": responder_context}
        ]
        
        responder_response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=responder_messages
        )
        
        final_content = responder_response.choices[0].message.content
        print(f"[AI-DEBUG] 🗣️ Final Response: {final_content[:100]}...")
        
        # Helper to extract the specific 'data' part for the UI
        # The UI expects tool_data[].data to be the result dict (e.g. {todos: []})
        ui_tool_data: List[Dict[str, Any]] = []
        for tr in tool_results:
             if 'data' in tr:
                 ui_tool_data.append({"tool": tr['tool'], "data": tr['data']})
        
        return {
            "content": final_content,
            "tool_calls_made": len(tool_results) > 0,
            "tool_data": ui_tool_data
        }

    except Exception as e:
        import traceback
        logging.error(f"Error in chatWithAI: {str(e)}")
        logging.error(traceback.format_exc())
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INTERNAL,
            message=f"Error processing AI request: {str(e)}"
        )
