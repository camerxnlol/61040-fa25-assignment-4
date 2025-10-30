---
timestamp: 'Fri Oct 24 2025 15:40:20 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251024_154020.3a1e3491.md]]'
content_id: 98156250c4b9ece9296ecf31bd138a29ad34d921c635f380b856c383fd71ec7a
---

# response:

Okay, let's break down how to create a robust TypeScript client for your API using Axios.

We'll cover:

1. **Project Setup:** `package.json` and `tsconfig.json`.
2. **Type Definitions:** Defining interfaces for requests and responses.
3. **Axios Instance:** Configuring a base Axios instance.
4. **API Client Class:** Encapsulating your API calls in a class.
5. **Error Handling:** A structured way to deal with API errors.
6. **Example Usage:** How to use your new client.

***

### 1. Project Setup

First, initialize a new Node.js project and install Axios:

```bash
mkdir labeling-api-client
cd labeling-api-client
npm init -y
npm install axios
npm install --save-dev typescript @types/node @types/axios
npx tsc --init
```

Now, let's adjust your `tsconfig.json`. A basic configuration might look like this:

**`tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "es2020",         // Or a more recent target like "es2022"
    "module": "commonjs",        // For Node.js, commonjs is typical
    "lib": ["es2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,              // Enable all strict type-checking options
    "esModuleInterop": true,     // Allows default imports from modules with no default export
    "skipLibCheck": true,        // Skip type checking of declaration files
    "forceConsistentCasingInFileNames": true // Ensure file casing consistency
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules"]
}
```

***

### 2. Type Definitions

Based on your API spec, let's create TypeScript interfaces. It's good practice to put these in a separate file (e.g., `src/types.ts`).

**`src/types.ts`**

```typescript
// --- Common Types ---
export type ID = string; // Assuming IDs are strings (e.g., UUIDs)

export interface ApiErrorResponse {
  error: string;
}

export class ApiError extends Error {
  public statusCode?: number;
  public details?: string;

  constructor(message: string, statusCode?: number, details?: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

// --- createLabel Endpoint ---
export interface CreateLabelRequest {
  name: string;
}

export interface CreateLabelSuccessResponse {
  label: ID;
}

// --- addLabel Endpoint ---
export interface AddLabelRequest {
  item: ID;
  label: ID;
}

// An empty object response. Using Record<string, never> is a common way to denote an empty object.
export type AddLabelSuccessResponse = Record<string, never>;

// --- deleteLabel Endpoint ---
export interface DeleteLabelRequest {
  item: ID;
  label: ID;
}

// An empty object response.
export type DeleteLabelSuccessResponse = Record<string, never>;
```

***

### 3. Axios Instance & API Client Class

Now, let's create the client itself. We'll use a class to encapsulate the API methods.

**`src/LabelingApiClient.ts`**

```typescript
import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  ID,
  ApiError,
  ApiErrorResponse,
  CreateLabelRequest,
  CreateLabelSuccessResponse,
  AddLabelRequest,
  AddLabelSuccessResponse,
  DeleteLabelRequest,
  DeleteLabelSuccessResponse,
} from './types'; // Import your defined types

export interface LabelingApiClientConfig {
  baseURL: string;
  // You can add more configurations here, e.g., headers, timeout, authentication tokens
  // authToken?: string;
}

export class LabelingApiClient {
  private axiosInstance: AxiosInstance;

  constructor(config: LabelingApiClientConfig) {
    this.axiosInstance = axios.create({
      baseURL: config.baseURL,
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': config.authToken ? `Bearer ${config.authToken}` : ''
      },
      timeout: 10000, // 10 seconds timeout
    });
  }

  /**
   * Helper to handle Axios errors and convert them into our custom ApiError.
   */
  private handleError(error: unknown): never { // `never` indicates this function will always throw
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ApiErrorResponse>;
      if (axiosError.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        const errorMessage = axiosError.response.data?.error || axiosError.message;
        throw new ApiError(
          errorMessage,
          axiosError.response.status,
          axiosError.response.data?.error // Use the detailed error from the API
        );
      } else if (axiosError.request) {
        // The request was made but no response was received
        throw new ApiError("No response received from server.", undefined, axiosError.message);
      } else {
        // Something happened in setting up the request that triggered an Error
        throw new ApiError(`Error setting up request: ${axiosError.message}`);
      }
    }
    // Handle non-Axios errors
    if (error instanceof Error) {
      throw new ApiError(`An unexpected error occurred: ${error.message}`);
    }
    throw new ApiError("An unknown error occurred.");
  }


  /**
   * POST /api/Labeling/createLabel
   * Creates a new label with the given name and returns its identifier.
   */
  public async createLabel(name: string): Promise<ID> {
    const requestBody: CreateLabelRequest = { name };
    try {
      const response = await this.axiosInstance.post<CreateLabelSuccessResponse>(
        '/api/Labeling/createLabel',
        requestBody
      );
      return response.data.label;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * POST /api/Labeling/addLabel
   * Associates an existing label with a specific item.
   */
  public async addLabel(item: ID, label: ID): Promise<void> {
    const requestBody: AddLabelRequest = { item, label };
    try {
      await this.axiosInstance.post<AddLabelSuccessResponse>(
        '/api/Labeling/addLabel',
        requestBody
      );
      // No specific data to return for an empty success response
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * POST /api/Labeling/deleteLabel
   * Removes the association of a label from a specific item.
   */
  public async deleteLabel(item: ID, label: ID): Promise<void> {
    const requestBody: DeleteLabelRequest = { item, label };
    try {
      await this.axiosInstance.post<DeleteLabelSuccessResponse>(
        '/api/Labeling/deleteLabel',
        requestBody
      );
      // No specific data to return for an empty success response
    } catch (error) {
      this.handleError(error);
    }
  }
}
```

***

### 4. Example Usage

Let's create an example file to demonstrate how to use your new client.

**`src/index.ts`**

```typescript
import { LabelingApiClient, ApiError } from './LabelingApiClient';
import { ID } from './types';

// Configure your API client
const API_BASE_URL = 'http://localhost:3000'; // Replace with your actual API base URL

const labelingApi = new LabelingApiClient({
  baseURL: API_BASE_URL,
  // authToken: 'your_auth_token_here' // If you add auth
});

async function runExamples() {
  let createdLabelId: ID | undefined;
  const itemId = 'item_123'; // Example item ID

  // --- Example 1: Create a Label ---
  console.log('--- Creating a Label ---');
  try {
    const labelName = 'Important Tag';
    createdLabelId = await labelingApi.createLabel(labelName);
    console.log(`Successfully created label "${labelName}" with ID: ${createdLabelId}`);
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`Error creating label: ${error.message} (Status: ${error.statusCode})`);
    } else {
      console.error('An unexpected error occurred:', error);
    }
  }

  // --- Example 2: Add Label to an Item ---
  if (createdLabelId) {
    console.log('\n--- Adding Label to Item ---');
    try {
      await labelingApi.addLabel(itemId, createdLabelId);
      console.log(`Successfully associated label ${createdLabelId} with item ${itemId}`);
    } catch (error) {
      if (error instanceof ApiError) {
        console.error(`Error adding label: ${error.message} (Status: ${error.statusCode})`);
      } else {
        console.error('An unexpected error occurred:', error);
      }
    }

    // --- Example 3: Attempt to Add the Same Label (should fail based on requirement) ---
    console.log('\n--- Attempting to Add Same Label (Expected Error) ---');
    try {
      await labelingApi.addLabel(itemId, createdLabelId);
      console.log(`Unexpected: Successfully associated label ${createdLabelId} with item ${itemId} again.`);
    } catch (error) {
      if (error instanceof ApiError) {
        console.error(`Expected error adding label again: ${error.message} (Status: ${error.statusCode})`);
      } else {
        console.error('An unexpected error occurred:', error);
      }
    }

    // --- Example 4: Delete Label from an Item ---
    console.log('\n--- Deleting Label from Item ---');
    try {
      await labelingApi.deleteLabel(itemId, createdLabelId);
      console.log(`Successfully removed association of label ${createdLabelId} from item ${itemId}`);
    } catch (error) {
      if (error instanceof ApiError) {
        console.error(`Error deleting label: ${error.message} (Status: ${error.statusCode})`);
      } else {
        console.error('An unexpected error occurred:', error);
      }
    }

    // --- Example 5: Attempt to Delete Non-Associated Label (should fail) ---
    console.log('\n--- Attempting to Delete Non-Associated Label (Expected Error) ---');
    try {
      await labelingApi.deleteLabel(itemId, createdLabelId);
      console.log(`Unexpected: Successfully removed non-associated label ${createdLabelId} from item ${itemId}`);
    } catch (error) {
      if (error instanceof ApiError) {
        console.error(`Expected error deleting non-associated label: ${error.message} (Status: ${error.statusCode})`);
      } else {
        console.error('An unexpected error occurred:', error);
      }
    }
  } else {
    console.log('\nCould not run add/delete examples because label creation failed.');
  }
}

runExamples();
```

***

### To Run This:

1. Make sure you have a local server running at `http://localhost:3000` that implements these API endpoints.
   * For testing, you might use a tool like `json-server` or a simple Express app to mock the endpoints.
2. Compile your TypeScript code:
   ```bash
   npx tsc
   ```
3. Run the compiled JavaScript:
   ```bash
   node dist/index.js
   ```

### Key Takeaways and Best Practices:

* **Strong Typing:** By defining interfaces for all request and response bodies, TypeScript will catch errors at compile time, reducing runtime bugs.
* **Axios Instance:** Creating an `axios.create()` instance allows you to set common configurations (like `baseURL`, `headers`, `timeout`) once and reuse them across all API calls.
* **API Client Class:** Encapsulating API logic in a class provides a clean, organized, and reusable way to interact with your API. It also makes it easier to mock for testing.
* **Centralized Error Handling:** The `handleError` private method processes different types of Axios errors and transforms them into a consistent `ApiError` type. This makes error handling in your application code much cleaner.
* **`never` return type for `handleError`:** By marking `handleError` as returning `never`, TypeScript understands that this function will *always* throw an error, which helps with flow analysis.
* **`Promise<void>` for Empty Responses:** For endpoints that return an empty object on success (like `addLabel` and `deleteLabel`), returning `Promise<void>` is the idiomatic TypeScript way.
* **Environment Variables:** In a real application, `API_BASE_URL` should ideally come from environment variables (`process.env.REACT_APP_API_URL` for React, `process.env.API_URL` for Node.js) rather than being hardcoded.
* **Authentication:** You can easily integrate authentication tokens into the `axiosInstance` headers, either during creation or dynamically through Axios interceptors.
