Principle: Author creates, views, and deletes posts ...
Trace: Author Alice creates a post. ✅
Trace: Author Alice creates a second post. ✅
Trace: Author Bob creates a post. ✅
Trace: Alice views her posts. ✅
Trace: Alice views a specific post by ID. ✅
Trace: Alice deletes her first post. ✅
Trace: Verify post is deleted. ✅
Principle: Author creates, views, and deletes posts ... ok (717ms)

Action: create successfully adds a new post and returns its ID ...
Action: create - Creating a post for user:Creator. ✅
Effect: Verifying the post exists with ID: 0199e121-c0fe-7cd2-8c43-cca9faa42873. ✅
Action: create successfully adds a new post and returns its ID ... ok (605ms)

Action: delete successfully removes an existing post ...
Action: delete - Attempting to delete post with ID: 0199e121-c358-7fcb-aed9-b62c3a9e6df6. ✅
Effect: Verifying post 0199e121-c358-7fcb-aed9-b62c3a9e6df6 is no longer in the system. ✅
Action: delete successfully removes an existing post ... ok (625ms)

Action: delete fails for a non-existent post ...
Requirement Check: delete - Attempting to delete non-existent post post:fake_id. ✅
Action: delete fails for a non-existent post ... ok (515ms)

Query: _getPostsByAuthor returns all posts by a specific author ...
Query: _getPostsByAuthor - Retrieving posts for user:Alice. ✅
Query: _getPostsByAuthor - Retrieving posts for user:Bob. ✅
Query: _getPostsByAuthor returns all posts by a specific author ... ok (675ms)

Query: _getPostsByAuthor returns an empty array if author has no posts ...
Query: _getPostsByAuthor - Retrieving posts for user:NoPosts (who has no posts). ✅
Query: _getPostsByAuthor returns an empty array if author has no posts ... ok (564ms)

Query: _getPostById returns a specific post by its ID ...
Query: _getPostById - Retrieving post with ID: 0199e121-cc9d-75a2-b408-90d286b2be83. ✅
Query: _getPostById returns a specific post by its ID ... ok (596ms)

Query: _getPostById returns an empty array for a non-existent post ID ...
Query: _getPostById - Retrieving post with non-existent ID: post:non_existent. ✅
Query: _getPostById returns an empty array for a non-existent post ID ... ok (546ms)
