# Project Reflection

## Overview
This project gave me a deep appreciation for how large language models (LLMs) can accelerate software development when used thoughtfully. It also revealed the importance of maintaining control and structure when collaborating with multiple AI tools across a full-stack system.

---

## Syncing Context Between Frontend and Backend
One of the hardest parts of this project was managing synchronization between the backend (using Context) and the frontend (using Cursor). Because both tools needed to be aware of each other’s updates, any mismatch in data shape caused debugging headaches.  

At times, I forgot to update Cursor with recent backend changes, which led to long debugging sessions. In the future, I would like to explore using Context to automatically generate a brief design summary of recent changes that can be fed into Cursor. This would make collaboration between LLMs smoother and reduce human error in communication.

---

## Using Context as a Debugger and Learning Tool
Context was a strong teaching companion as well as a coding partner. I often used it to summarize recent changes or explain subtle bugs that I didn’t fully understand. When I began to lose track of the code’s flow, Context’s explanations helped me regain agency over my project.  
Through this, I learned not only how to fix issues but also why they occurred, improving my debugging intuition.

---

## Asking Clarifying Questions
A turning point in my workflow came when I started asking agentic coding models like Context and Cursor to ask *clarifying questions* before they generated code.  
This small change had a large impact: it reduced ambiguity, minimized iterations, and led to cleaner, more accurate code.  
At the beginning of Assignment 4b, I was essentially “prompting and praying.” By encouraging the models to check their understanding first, I became a more intentional collaborator rather than a passive user.

---

## Manual Changes and Updating Context
I occasionally made manual edits to files without updating Context afterward. Because Context assumes that the current file state matches its last known output, this created desynchronization issues. Some of its bug fixes failed simply because it was unaware of my local changes.  
If Context could automatically read updated TypeScript files into its working state, it would prevent this problem. This experience taught me how vital shared context and consistent synchronization are when working with agentic coding systems.

---

## Leveraging Multiple AI Tools
A major takeaway was learning how to **combine tools based on their strengths**.  
For example, I used open-source component libraries like **shadcn** (in a Vue adaptation) for clean UI elements instead of having Context code them from scratch. I also used **v0** to generate layout inspiration and initial structures for pages.  
This taught me that success with AI-assisted development is not about using one tool for everything, but rather about orchestrating specialized tools to work together effectively.

---

## Lessons and Future Growth
- **What went well:** I learned how to collaborate effectively with LLMs and use them as debugging and design partners.  
- **What was challenging:** Maintaining synchronization between tools and managing ambiguity in prompts.  
- **Skills gained:** Prompt clarity, debugging intuition, and cross-tool coordination.  
- **Next steps:** Continue developing my ability to architect systems that integrate LLMs reliably, with explicit design documentation linking each component’s context.

---

## Conclusions on LLMs in Software Development
This project showed me that LLMs can dramatically accelerate development, but only when paired with human structure and discipline.  
They thrive when given clear context, precise direction, and accountability loops. In many ways, they function less as replacements for engineers and more as **force multipliers** for engineers who know how to guide them.  
Going forward, I want to continue refining the balance between human agency and LLM autonomy—a skill that will be central to my growth as a software engineer.
