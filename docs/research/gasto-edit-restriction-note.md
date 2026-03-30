# Gasto Edit/Delete Permission Restriction Analysis

**Date:** 2026-03-30
**File:** `app/(dashboard)/gastos/actions.ts`
**Requirement:** Only dono (owner) should be able to edit/delete gastos after creation.

---

## 1. Current State of `updateGasto` (lines 269-357)

**Permission check:** Only restricts `motorista` role (line 297).

```typescript
// Line 297 — only motorista is checked
if (usuario.role === 'motorista') {
  // ownership verification...
}
```

**Problem:** `admin` / `gestor` role passes through with NO restriction. They can edit ANY gasto belonging to their empresa. There is no `created_by` ownership check and no role gate blocking non-dono users.

**`getGasto` (lines 446-480) has the same gap:** admin/gestor can fetch any gasto for the edit form without restriction (only motorista is blocked at line 466).

---

## 2. Current State of `deleteGasto` (lines 363-390)

**Permission check:** Only blocks `motorista` role (line 372).

```typescript
// Line 372 — only motorista is blocked
if (usuario.role === 'motorista') {
  return { success: false, error: 'Motorista nao tem permissao para excluir gastos' };
}
```

**Problem:** `admin` / `gestor` role is NOT blocked. They can delete any gasto. The JSDoc comment on line 362 even says "Only dono/admin can delete" — but the requirement now is that ONLY dono should be able to delete.

---

## 3. What Needs to Change

### Rule: Only `dono` can edit or delete gastos after creation.

| Function | Current Behavior | Required Behavior |
|----------|-----------------|-------------------|
| `updateGasto` | motorista restricted, admin/gestor allowed | Only `dono` allowed; motorista and admin/gestor blocked |
| `deleteGasto` | motorista blocked, admin/gestor allowed | Only `dono` allowed; motorista and admin/gestor blocked |
| `getGasto` | motorista restricted, admin/gestor allowed | Only `dono` allowed (prevents loading edit form) |

### Specific Code Modifications

#### A. `updateGasto` — Add dono-only gate (after line 280, before existing motorista check)

Add early return for non-dono roles:

```typescript
// Only dono can edit gastos
if (usuario.role !== 'dono') {
  return { success: false, error: 'Apenas o dono pode editar gastos' };
}
```

This replaces the motorista-only ownership check block (lines 297-318) and the motorista forced-id block (lines 321-333), since neither motorista nor admin/gestor would reach that code.

#### B. `deleteGasto` — Replace motorista block with dono-only gate (line 372)

Change from:

```typescript
if (usuario.role === 'motorista') {
  return { success: false, error: 'Motorista nao tem permissao para excluir gastos' };
}
```

To:

```typescript
if (usuario.role !== 'dono') {
  return { success: false, error: 'Apenas o dono pode excluir gastos' };
}
```

#### C. `getGasto` — Add dono-only gate for edit access (after line 453)

Add early return for non-dono roles to prevent loading the edit form:

```typescript
// Only dono can access gasto for editing
if (usuario.role !== 'dono') {
  return { success: false, error: 'Apenas o dono pode editar gastos' };
}
```

**Note:** If `getGasto` is also used for read-only display (not just editing), consider splitting into two functions or adding a `mode` parameter to distinguish view vs edit access.

#### D. Update JSDoc comments

- `updateGasto` line 267: Change to "Only dono can update gastos."
- `deleteGasto` line 361: Change to "Only dono can delete gastos. Admin and motorista CANNOT delete."

---

## 4. Additional Considerations

- **`createGasto`** does NOT need changes — all roles (dono, admin, motorista) should still be able to CREATE gastos. The restriction is only on edit/delete after creation.
- **RLS policies** in Supabase should also be reviewed to ensure they enforce the same dono-only restriction at the database level, not just at the application layer.
- **UI components** that render edit/delete buttons should also hide those buttons for non-dono users to prevent confusing UX (show button -> click -> get error).
