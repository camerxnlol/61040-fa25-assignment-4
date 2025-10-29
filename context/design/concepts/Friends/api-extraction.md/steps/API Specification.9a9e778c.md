---
timestamp: 'Tue Oct 28 2025 01:49:43 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251028_014943.d45000da.md]]'
content_id: 9a9e778cf91e03c27ed82c3dc864d7fad3ad58dcbf2dba36bedeb88cdfd24734
---

# API Specification: Labeling Concept

**Purpose:** Organize items by associating them with descriptive labels.

***

## API Endpoints

### POST /api/Labeling/createLabel

**Description:** Creates a new label with the given name.

**Requirements:**

* No Label with the given `name` already exists.

**Effects:**

* Creates a new Label `l`; sets the name of `l` to `name`; returns `l` as `label`.

**Request Body:**

```json
{
  "name": "string"
}
```

**Success Response Body (Action):**

```json
{
  "label": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Labeling/addLabel

**Description:** Associates a label with a specific item.

**Requirements:**

* The `item` and `label` must exist.
* The `item` must not already be associated with the specified `label`.

**Effects:**

* The `label` is added to the set of labels associated with the `item`.

**Request Body:**

```json
{
  "item": "string",
  "label": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Labeling/deleteLabel

**Description:** Removes a specific label from an item.

**Requirements:**

* The `item` and `label` must exist.
* The `item` must currently be associated with the specified `label`.

**Effects:**

* The `label` is removed from the set of labels associated with the `item`.

**Request Body:**

```json
{
  "item": "string",
  "label": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***
