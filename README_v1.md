# Tiptap Collaborative Editor - Fix Documentation

## Overview

This package contains the fixed implementation for your Tiptap collaborative editor with:

1. **Real-time collaboration sync** - Multiple users can now see each other's typing in real-time
2. **User presence & cursors** - See who's online and where they're typing
3. **Persistent answers** - Answers are saved to your PostgreSQL database
4. **Per-question save** - Individual save button for each question

---

## Understanding the Architecture

### What Tiptap Cloud Does vs Your Database

```
┌─────────────────────────────────────────────────────────────────┐
│                     REAL-TIME LAYER                              │
│  ┌─────────┐      ┌──────────────┐      ┌─────────┐            │
│  │ User A  │◄────►│ Tiptap Cloud │◄────►│ User B  │            │
│  │ Browser │      │ (WebSocket)  │      │ Browser │            │
│  └─────────┘      └──────────────┘      └─────────┘            │
│                          │                                      │
│     • Syncs keystrokes instantly                                │
│     • Tracks cursor positions                                   │
│     • Handles conflict resolution (CRDT)                        │
│     • Temporary state - not for permanent storage               │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼ (User clicks "Save Answer")
┌─────────────────────────────────────────────────────────────────┐
│                    PERSISTENCE LAYER                             │
│  ┌─────────────┐      ┌────────────┐      ┌──────────────┐     │
│  │ Your API    │─────►│ PostgreSQL │      │ Final Answer │     │
│  │ Backend     │      │ Database   │      │ Stored Here  │     │
│  └─────────────┘      └────────────┘      └──────────────┘     │
│                                                                  │
│     • Stores final answer content (HTML)                        │
│     • Tracks when answer was saved                              │
│     • This is the source of truth                               │
└─────────────────────────────────────────────────────────────────┘
```

### Key Points:

- **Tiptap Cloud** = Real-time sync engine (temporary, ephemeral)
- **Your Database** = Permanent storage (source of truth)
- **Flow**: Users type → syncs via Tiptap Cloud → user clicks Save → saves to your DB

---

## Files Changed

### 1. `prisma/schema.prisma`
Added fields to the `Question` model:
```prisma
answer       String?   @db.Text    // HTML content
answerJson   String?   @db.Text    // JSON for Tiptap
answeredAt   DateTime?             // Last saved timestamp
```

### 2. `backend/routes/rfp.js`
Added two new endpoints:
- `GET /api/rfps/:rfpId/questions/:questionId/answer` - Fetch saved answer
- `PUT /api/rfps/:rfpId/questions/:questionId/answer` - Save answer

### 3. `frontend/src/components/editor/CollaborativeEditor.tsx`
Complete rewrite with:
- Stable Y.Doc using `useRef` (was creating new doc on every render)
- Enabled `CollaborationCursor` extension for user carets
- Added save button with status feedback
- Proper initial content loading from database
- Character count display

### 4. `frontend/src/app/rfp/[rfpId]/page.tsx`
Updated to:
- Fetch answers from database when switching questions
- Pass `onSave` callback to editor
- Track which questions have been answered
- Show last saved timestamp
- Removed global "Save Draft" button (now per-question)

### 5. `frontend/src/lib/api.ts`
Added answer API methods:
- `api.rfps.getAnswer(rfpId, questionId)`
- `api.rfps.saveAnswer(rfpId, questionId, { answer, answerJson })`

### 6. `frontend/src/types/index.ts`
Added TypeScript types for answers and editor.

---

## Setup Instructions

### Step 1: Update Database Schema

```bash
# Option A: Using Prisma migrate
cd your-backend
cp /path/to/tiptap-collab-fix/prisma/schema.prisma ./prisma/
npx prisma migrate dev --name add_answer_fields

# Option B: Manual SQL migration
psql your_database < /path/to/tiptap-collab-fix/prisma/migrations/add_answer_fields.sql
```

### Step 2: Update Backend Routes

Replace your `routes/rfp.js` with the new version:
```bash
cp /path/to/tiptap-collab-fix/backend/routes/rfp.js ./routes/
```

### Step 3: Update Frontend Components

```bash
# Copy the new components
cp /path/to/tiptap-collab-fix/frontend/src/components/editor/CollaborativeEditor.tsx \
   ./src/components/editor/

cp /path/to/tiptap-collab-fix/frontend/src/app/rfp/\[rfpId\]/page.tsx \
   ./src/app/rfp/\[rfpId\]/

cp /path/to/tiptap-collab-fix/frontend/src/lib/api.ts ./src/lib/
cp /path/to/tiptap-collab-fix/frontend/src/types/index.ts ./src/types/
```

### Step 4: Install Required Packages

```bash
# Frontend
npm install @hocuspocus/provider @tiptap/extension-collaboration-cursor
```

**Note**: The import changed from `@tiptap-pro/provider` to `@hocuspocus/provider`. 
If you're using Tiptap Cloud specifically, you may need to adjust the import:
```typescript
// Option 1: Hocuspocus (open source)
import { TiptapCollabProvider } from "@hocuspocus/provider";

// Option 2: Tiptap Cloud Pro
import { TiptapCollabProvider } from "@tiptap-pro/provider";
```

### Step 5: Restart Services

```bash
# Backend
npm run dev

# Frontend
npm run dev
```

---

## What Was Wrong (Root Causes)

### Issue 1: Y.Doc Created on Every Render
```typescript
// ❌ WRONG - creates new document each render, breaks sync
const ydoc = new Y.Doc();

// ✅ FIXED - stable document reference
const ydocRef = useRef<Y.Doc | null>(null);
if (!ydocRef.current) {
  ydocRef.current = new Y.Doc();
}
```

### Issue 2: CollaborationCursor Was Commented Out
```typescript
// ❌ WRONG - cursors disabled
// CollaborationCaret.configure({ ... })

// ✅ FIXED - cursors enabled
CollaborationCursor.configure({
  provider: providerRef.current!,
  user: { name: user.name, color: user.color },
}),
```

### Issue 3: No Database Persistence
- Question model had no `answer` field
- No API endpoints for saving/loading answers
- Editor content disappeared on page reload

### Issue 4: Provider Timing Issue
The provider needs to be initialized before the editor uses it:
```typescript
// ✅ FIXED - provider initialized in useEffect, editor waits
const [editorReady, setEditorReady] = useState(false);

useEffect(() => {
  // ... create provider
  setEditorReady(true);
}, []);

const editor = useEditor({ ... }, [editorReady]);
```

---

## FAQ

### Q: Who wrote which line?
**A**: This is NOT tracked. The collaborative editor produces a single merged document. When saved, you just save the content - not attribution per line. Real-time cursors show who's typing *now*, but that information is ephemeral.

### Q: Where is data stored?
**A**: 
- **Tiptap Cloud**: Temporary real-time sync state
- **Your PostgreSQL**: Permanent answer storage

### Q: What happens if two users type at the same time?
**A**: Tiptap uses CRDT (Conflict-free Replicated Data Type) to merge changes automatically. Both users' edits will be preserved.

### Q: What if someone forgets to click Save?
**A**: The content only persists in Tiptap Cloud temporarily. Add auto-save if needed:
```typescript
// Add debounced auto-save
useEffect(() => {
  const timeout = setTimeout(() => {
    if (editor && onSave) {
      handleSave();
    }
  }, 5000); // Auto-save after 5 seconds of inactivity
  return () => clearTimeout(timeout);
}, [editor?.getHTML()]);
```

---

## Testing

1. Open the RFP editor in two different browsers (Chrome + Firefox)
2. Both users should show as "Online"
3. Type in one browser - should appear instantly in the other
4. You should see the other user's cursor with their name
5. Click "Save Answer" - should persist to database
6. Refresh page - answer should reload from database

---

## Troubleshooting

### "Connecting..." never changes to "Synced"
- Check Tiptap Cloud credentials in `.env`
- Verify JWT token is being generated correctly
- Check browser console for WebSocket errors

### Users don't see each other
- Ensure both are using the same `documentName`
- Check that the provider is connecting to the same Tiptap Cloud app

### Answers not saving
- Check backend logs for errors
- Verify database migration was applied
- Test API endpoint directly with curl/Postman

### Cursors not showing
- Ensure `CollaborationCursor` extension is installed
- Check that `user` prop is being passed correctly
- Add the CSS styles for `.collaboration-cursor__*`