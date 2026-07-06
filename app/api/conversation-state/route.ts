import { NextRequest, NextResponse } from 'next/server';
import type { ConversationState } from '@/types/conversation';
import { requireUser } from '@/lib/auth/server';
import { coerceConversationState, createEmptyConversationState, resolveConversationSession } from '@/lib/session-helpers';
import { updateConversationContext } from '@/lib/session-store';

// Conversation state lives on the caller's GenerationSession row, never in
// process globals — globals leaked conversation context between users.

async function loadUserConversation(userId: string, sandboxId?: string | null) {
  const session = await resolveConversationSession(sandboxId, userId);
  const state = coerceConversationState(session?.conversationCtx);
  return { session, state };
}

async function persist(sessionId: string, state: ConversationState) {
  state.lastUpdated = Date.now();
  await updateConversationContext(sessionId, state);
}

// GET: Retrieve current conversation state
export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser();
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const sandboxId = request.nextUrl.searchParams.get('sandboxId');
    const { state } = await loadUserConversation(auth.user.id, sandboxId);

    if (!state) {
      return NextResponse.json({
        success: true,
        state: null,
        message: 'No active conversation'
      });
    }

    return NextResponse.json({ success: true, state });
  } catch (error) {
    console.error('[conversation-state] Error getting state:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}

// POST: Reset or update conversation state
export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser();
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { action, data, sandboxId } = await request.json();
    const { session, state } = await loadUserConversation(auth.user.id, sandboxId);

    switch (action) {
      case 'reset': {
        const fresh = createEmptyConversationState();
        if (session) {
          await persist(session.id, fresh);
        }
        return NextResponse.json({
          success: true,
          message: 'Conversation state reset',
          state: fresh
        });
      }

      case 'clear-old': {
        const current = state ?? createEmptyConversationState();
        current.context.messages = current.context.messages.slice(-5);
        current.context.edits = current.context.edits.slice(-3);
        current.context.projectEvolution.majorChanges =
          current.context.projectEvolution.majorChanges.slice(-2);
        if (session) {
          await persist(session.id, current);
        }
        return NextResponse.json({
          success: true,
          message: 'Old conversation data cleared',
          state: current
        });
      }

      case 'update': {
        if (!state || !session) {
          return NextResponse.json({
            success: false,
            error: 'No active conversation to update'
          }, { status: 400 });
        }

        if (data) {
          if (data.currentTopic) {
            state.context.currentTopic = data.currentTopic;
          }
          if (data.userPreferences) {
            state.context.userPreferences = {
              ...state.context.userPreferences,
              ...data.userPreferences
            };
          }
          await persist(session.id, state);
        }

        return NextResponse.json({
          success: true,
          message: 'Conversation state updated',
          state
        });
      }

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use "reset", "clear-old" or "update"'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('[conversation-state] Error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}

// DELETE: Clear conversation state
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireUser();
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const sandboxId = request.nextUrl.searchParams.get('sandboxId');
    const { session } = await loadUserConversation(auth.user.id, sandboxId);
    if (session) {
      await persist(session.id, createEmptyConversationState());
    }

    return NextResponse.json({
      success: true,
      message: 'Conversation state cleared'
    });
  } catch (error) {
    console.error('[conversation-state] Error clearing state:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}
