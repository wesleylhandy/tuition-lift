-- Migration: LangGraph checkpoint tables
--
-- Checkpoint tables are NOT created by this migration. They are created by
-- @langchain/langgraph-checkpoint-postgres when PostgresSaver.setup() is
-- called from apps/agent on init. The library owns the schema; creating
-- tables here would risk drift from library updates.
--
-- See quickstart.md "LangGraph Checkpoint Setup (Agent Persistence)" for
-- connection config, setup flow, and DATABASE_URL usage.

DO $$ BEGIN NULL; END $$;
