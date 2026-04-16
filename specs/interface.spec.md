# Interface Spec — TODO Application

Covers: REST API contract and UI application layer behaviour. References Ubiquitous Language from `domain-model.spec.md`.

---

## Bounded Context: Application Layer

**Responsibility**: Coordinate user intent (HTTP requests, UI events) with the `Todo` Aggregate. Translates external representations to/from Domain objects. Contains no business rules — those live in the Aggregate.

**Separation rule**: If a condition check could cause a Todo to be invalid, the check belongs in the Aggregate, not here.

---

## API Contract (REST/JSON)

Base path: `/api/todos`

All timestamps are ISO 8601 UTC. All IDs are UUID v4 strings.

### Resource Representation

```json
{
  "id":        "string (TodoId, UUID v4)",
  "title":     "string (TodoTitle)",
  "status":    "active | completed",
  "createdAt": "string (ISO 8601 UTC)",
  "updatedAt": "string (ISO 8601 UTC)"
}
```

---

### Endpoints

#### GET /api/todos

List all Todos. Supports optional filtering via query parameter.

**Query parameters**:

| Parameter | Values | Default | Description |
|---|---|---|---|
| `filter` | `all` \| `active` \| `completed` | `all` | Applies `FilterCriteria` |

**Response 200**:
```json
{
  "todos": [ /* Todo[] */ ],
  "counts": {
    "all":       "integer",
    "active":    "integer",
    "completed": "integer"
  }
}
```

The `counts` field is always computed over ALL todos, regardless of `filter`. This allows the UI to display counts for all filter tabs without additional requests.

---

#### POST /api/todos

Create a new Todo. Invokes `Todo.create()`.

**Request body**:
```json
{
  "title": "string"
}
```

**Response 201** — the created Todo resource.

**Response 422** — `InvalidTitleError`:
```json
{
  "error": "INVALID_TITLE",
  "message": "string"
}
```

---

#### GET /api/todos/:id

Fetch a single Todo by `TodoId`.

**Response 200** — the Todo resource.

**Response 404** — `TodoNotFoundError`:
```json
{
  "error": "TODO_NOT_FOUND",
  "message": "string"
}
```

---

#### PATCH /api/todos/:id

Partial update. Supports updating `title` and/or `status` in a single request. Each field is independently optional.

**Request body** (all fields optional):
```json
{
  "title":  "string",
  "status": "active | completed"
}
```

Mapping to domain commands:
- `title` present -> `todo.updateTitle()`
- `status: "completed"` -> `todo.complete()`
- `status: "active"` -> `todo.reopen()`

**Response 200** — the updated Todo resource.

**Response 404** — `TodoNotFoundError`.

**Response 422** — `InvalidTitleError`.

---

#### DELETE /api/todos/:id

Permanently delete a Todo. Invokes `todo.delete()`.

**Response 204** — no body.

**Response 404** — `TodoNotFoundError`.

---

#### DELETE /api/todos?status=completed

Bulk delete all completed Todos ("Clear completed" action).

**Response 200**:
```json
{
  "deletedCount": "integer"
}
```

---

### Error Envelope (all 4xx/5xx)

```json
{
  "error":   "ERROR_CODE_CONSTANT",
  "message": "Human-readable description"
}
```

| HTTP Status | `error` value | Trigger |
|---|---|---|
| 404 | `TODO_NOT_FOUND` | `TodoId` does not exist |
| 422 | `INVALID_TITLE` | `InvalidTitleError` from Aggregate |
| 400 | `BAD_REQUEST` | Malformed JSON or unknown `status` value |
| 500 | `INTERNAL_ERROR` | Unhandled exception |

---

## UI Application Layer

### Views

The UI is a single-page browser application. No full-page reloads after initial load.

#### Main View: Todo List

Components:

- **Header**: Application title ("todos")
- **New Todo Input**: Text field with placeholder "What needs to be done?". Submitting (Enter key) calls `POST /api/todos`. Clears on success.
- **Todo List**: Ordered list of Todo items (order: `createdAt` descending, newest first).
- **Filter Bar**: Three tabs — "All", "Active", "Completed". Active tab highlighted. Selecting a tab applies `FilterCriteria` and re-renders the list.
- **Footer Bar** (visible only when at least one Todo exists):
  - Left: "{N} item(s) left" where N = count of `active` Todos.
  - Center: Filter tabs (same as Filter Bar above; one canonical set of tabs).
  - Right: "Clear completed" button (visible only when `completedCount > 0`).
- **Empty State**: When filtered list is empty, display a contextual message.

#### Todo Item Component

Each item displays:
- Checkbox: toggles `status` between `active` and `completed` via `PATCH /api/todos/:id`.
- Title text: double-click enters edit mode.
- Delete button ("x"): visible on hover. Calls `DELETE /api/todos/:id`.

Edit mode behaviour:
- Input field pre-filled with current `TodoTitle`.
- Pressing Enter or blurring the field submits via `PATCH /api/todos/:id` with the new title.
- Pressing Escape cancels edit without saving.
- Submitting an empty string deletes the Todo (calls `DELETE /api/todos/:id`).

---

### UI State Machine

```
FilterCriteria: all | active | completed   (default: all)
editingTodoId:  TodoId | null              (default: null)
todos:          Todo[]                     (source of truth from API)
```

State transitions:

```
User types title + presses Enter
  -> POST /api/todos
  -> on success: prepend to todos[], clear input

User clicks checkbox
  -> PATCH /api/todos/:id { status: toggled }
  -> on success: update todo in todos[]

User double-clicks title
  -> set editingTodoId = todo.id

User presses Enter in edit field
  -> PATCH /api/todos/:id { title: newTitle }
  -> on success: update todo in todos[], clear editingTodoId

User presses Escape in edit field
  -> clear editingTodoId (no API call)

User submits empty title in edit field
  -> DELETE /api/todos/:id
  -> on success: remove todo from todos[], clear editingTodoId

User clicks delete button
  -> DELETE /api/todos/:id
  -> on success: remove todo from todos[]

User clicks filter tab
  -> set FilterCriteria
  -> re-render list (client-side filter over todos[])

User clicks "Clear completed"
  -> DELETE /api/todos?status=completed
  -> on success: remove all completed todos from todos[]
```

---

### Non-Functional Requirements

| Concern | Requirement |
|---|---|
| Perceived latency | Optimistic UI updates for toggle and delete; rollback on API error |
| Initial load | Full todo list loaded on page load via `GET /api/todos` |
| Accessibility | Checkbox inputs have associated labels; edit field announced to screen readers |
| Keyboard navigation | All actions reachable without a mouse |
| Error display | API errors surfaced to user as non-blocking inline messages; auto-dismiss after 5s |

---

## TDD Plan

### API — Critical Test Cases

**GET /api/todos**
- Returns empty `todos` array and zero counts when no todos exist
- `filter=active` excludes completed todos from list but counts reflect all
- `filter=completed` excludes active todos from list
- Invalid `filter` value returns 400

**POST /api/todos**
- Valid title returns 201 with full Todo resource including a UUID `id`
- Empty title returns 422 with `error: "INVALID_TITLE"`

**PATCH /api/todos/:id**
- `status: "completed"` marks active todo as completed
- `status: "active"` reopens completed todo
- `status: "completed"` on already-completed todo returns 200 (idempotent)
- Unknown id returns 404
- Invalid title returns 422

**DELETE /api/todos/:id**
- Existing todo returns 204
- Unknown id returns 404

**DELETE /api/todos?status=completed**
- Deletes all completed; returns correct `deletedCount`
- When no completed todos exist: returns 200 with `deletedCount: 0`

### UI — Critical Test Cases

- Entering a title and pressing Enter creates a new item at the top of the list
- Pressing Escape in the new-todo input clears without creating
- Double-clicking a title enters edit mode for that item only
- Pressing Escape in edit mode restores original title
- Submitting blank title in edit mode deletes the item
- "Clear completed" button only visible when `completedCount > 0`
- "{N} item(s) left" reflects current `active` count after toggling
- Filter tabs correctly show/hide items without an additional network request

### Failure Modes

| Scenario | Expected Behaviour |
|---|---|
| API returns 500 on create | Input not cleared; error message displayed; UI state unchanged |
| API returns 500 on toggle | Checkbox reverts to previous state (optimistic rollback) |
| Network offline | Pending actions show error; previously loaded list remains visible |
| Duplicate rapid toggles | Second request supersedes first; final server state wins |
