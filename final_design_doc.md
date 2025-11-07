# Final Design Document

This document summarizes the evolution of my app design between **Assignment 2 (Concept Design)**, **Assignment 4b (Visual Design)**, and the **final design (Assignment 4c)**.  
It outlines both **front-end** and **back-end** changes, focusing on improvements in functionality, usability, and maintainability.

---

## Front-End Changes

### Overall Improvements
In **Assignment 4b**, my design felt **flat** and lacked personality. While functional, it didn’t fully capture the atmosphere or polish I envisioned for the app.

- **Assignment 4b Design (Before)**  
  ![Screenshot from 4b](assets/Screenshot%202025-11-07%20at%205.38.33 PM.png)

In **Assignment 4c**, I introduced several stylistic and interactive improvements that made the app more engaging and user-friendly.

- **Assignment 4c Design (After)**  
  ![Screenshot from 4c](assets/Screenshot%202025-11-07%20at%205.37.11 PM.png)

---

### Visual Enhancements
- **Gradient Background with Noise**  
  Added a subtle gradient background with a noise texture to make the landing page feel more dynamic.  
  This also **draws attention toward the center of the screen**, where the key text and actions are located.

- **Increased Depth & Focus**  
  The new background and layout provide better **visual hierarchy**, giving more weight to important UI elements.

---

### User Experience (UX) Refinements
- **Sorting Posts on Profile**  
  Implemented post sorting on user profiles to make content easier to navigate and personalize.  
  Users can now quickly find their most relevant or recent posts.

- **Intuitive Subtexts for Routes**  
  Added small subtexts to navigation routes, clarifying where each button or link leads.  
  This improves user understanding and reduces misclicks.

- **Subtle Animations**  
  Introduced smooth animations for transitions, buttons, and hover states.  
  These bring the interface to life and make interactions feel more natural and polished.  
  *(As someone who appreciates good UI and animation, this was one of my favorite parts of the redesign.)*

---

## Back-End Changes

### Migration of State Logic
- **Moving State Up to Requesting Concept**  
  We restructured how state is managed for **excluded actions**, pushing state upward into the **requesting concept**.  
  This made the architecture cleaner and reduced duplication of logic across components.

### Sessioning and Authentication
- **Introduction of Sessioning Concept**  
  Adopted the **sessioning concept** (inspired by *ConceptBox*) to handle session logic and user authentication.  
  This significantly improved the maintainability and reliability of session-related code.

---

### Concept Stability
- Most of my **concepts and actions remained consistent** since Assignment 2.  
  I spent considerable time early on designing them carefully, so only minimal adjustments were required later.

- **Minor Adjustments**  
  Updated the **shape of action return values** to ensure that data surfaces correctly to the front end after passing through the requesting concept.

---

### New Functionality
- **Friends Concept**  
  Added a new concept allowing users to:
  - Send and accept friend requests  
  - View each other's rankings  

  This addition enhances the social aspect of the app and creates a sense of competition and connection among users.  
  For more details and justification, see [Changes for Assignment 4b](path/to/changes4b.md).

---

### Summary
| Area | Change | Impact |
|------|---------|---------|
| **Frontend** | Added gradient background & noise | Improved depth and focus |
| **Frontend** | Sorting, subtexts, and animations | Better UX and interactivity |
| **Backend** | Moved state logic upward | Cleaner and more modular architecture |
| **Backend** | Added sessioning concept | Stronger authentication management |
| **Backend** | Introduced friends concept | Enhanced social engagement |

---

*Overall, my final design feels more cohesive, expressive, and technically sound than in earlier stages. The combination of improved front-end visuals and more structured back-end logic results in a smoother and more enjoyable user experience.*
