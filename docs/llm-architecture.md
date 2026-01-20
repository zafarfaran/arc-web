# LLM Architecture

## Overview

The AI uses a **three-phase orchestration pattern**:

1. **Planner** (gpt-4o-mini) - Analyzes user intent and decides which tools to call
2. **Executor** - Backend runs the selected tools against Firestore
3. **Responder** (gpt-4o-mini) - Generates a natural language response with the results

## Architecture Diagram

```mermaid
flowchart TB
    subgraph Frontend["Frontend (React)"]
        UI[FloatingAIButton]
        Service[aiService.ts]
        Cards[Card Components]
    end

    subgraph Backend["Backend (Firebase Functions)"]
        Main[chatWithAI]

        subgraph Phase1["Phase 1: Planner"]
            P1[GPT-4o-mini]
            P1Out["JSON: {reasoning, tools[], time_context}"]
        end

        subgraph Phase2["Phase 2: Executor"]
            Tools[Tool Handlers]
            DB[(Firestore)]
        end

        subgraph Phase3["Phase 3: Responder"]
            P3[GPT-4o-mini]
            P3Out[Natural Language Response]
        end
    end

    UI -->|"User message"| Service
    Service -->|"messages[]"| Main
    Main --> P1
    P1 --> P1Out
    P1Out -->|"tool calls"| Tools
    Tools <-->|"read/write"| DB
    Tools -->|"tool_results"| P3
    P3 --> P3Out
    P3Out -->|"{content, toolData}"| Service
    Service --> UI
    UI --> Cards

    subgraph ToolList["Available Tools"]
        T1[get_todos / add_todo / complete_todo]
        T2[get_habits / toggle_habit]
        T3[get_goals / update_goal_progress]
        T4[get_user_profile / get_focus_summary]
    end

    Tools -.-> ToolList
```

## Key Files

| File | Purpose |
|------|---------|
| `src/services/aiService.ts` | Frontend service calling Firebase function |
| `src/components/layout/FloatingAIButton.tsx` | Chat UI component |
| `functions/main.py` | Backend orchestration (3-phase flow) |
| `functions/prompts.py` | System prompts for planner/responder |
| `functions/tools.py` | 9 tool handlers (get_todos, add_todo, etc.) |
