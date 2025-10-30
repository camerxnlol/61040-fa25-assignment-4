---
timestamp: 'Fri Oct 24 2025 15:31:05 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251024_153105.49424362.md]]'
content_id: d15c9e88d5af6c2aaa853c439ebb0a6436211399a5769ab837d75dafdf28c765
---

# API Specification: Labeling Concept

**Purpose:** organize items by associating descriptive keywords, allowing for flexible categorization and retrieval.

***

## API Endpoints

### POST /api/Labeling/createLabel

**Description:** Creates a new label with the given name and returns its identifier.

**Requirements:**

* No Label with the given `name` already exists.

**Effects:**

* Creates a new Label `l`.
* Sets the name of `l` to `name`.
* Returns `l` as `label`.

**Request Body:**

```json
{
  "name": "string"
}
```

**Success Response Body (Action):**

```json
{
  "label": "ID"
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

**Description:** Associates an existing label with a specific item.

**Requirements:**

* The item must exist.
* The label must exist.
* The item is not already associated with this label.

**Effects:**

* Associates the given label with the specified item.

**Request Body:**

```json
{
  "item": "ID",
  "label": "ID"
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

**Description:** Removes the association of a label from a specific item.

**Requirements:**

* The item must exist.
* The label must exist.
* The item is currently associated with this label.

**Effects:**

* Removes the association of the given label from the specified item.

**Request Body:**

```json
{
  "item": "ID",
  "label": "ID"
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
