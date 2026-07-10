## **Software Requirements Specification (SRS) Report Title:** MailX: AI-Powered Email Assistant Browser Extension 

**Course Title** : Software Engineering **Course Code** : CSE412 **Section** : 5 **Semester** : Summer-26 **Date of Submission** : 7th June 2026 

## **Submitted By** 

## **Team-A** 

|**Name**|**Student ID**|
|---|---|
|Raquib Uddin Sarkar|2023-2-60-101|
|Md. Sadik Shahriar|2023-2-60-103|
|Chayan Das|2023-2-60-167|
|Shahriar Mahabub Oishik|2023-3-60-073|



## **Submitted To** 

Yasin Sazid 

_Lecturer_ 

_Department of CSE East West University_ 

## 1. Introduction 

## 1.1 Project Overview 

Email has become one of the most important communication channels for businesses, professionals, researchers, and students. However, users often spend significant time reading lengthy emails, identifying important information, responding to messages, and managing follow-up activities. In addition, phishing attacks and spam emails continue to pose security risks. 

MailX is an AI-powered browser extension designed to enhance email productivity and security by integrating directly with email platforms such as Gmail. The extension provides intelligent features including email summarization, smart reply suggestions, email open tracking, priority detection, task extraction, follow-up reminders, spam detection, and phishing link detection 

## 1.2 Purpose and Scope 

The purpose of MailX is to improve email productivity and security through intelligent automation and AI assistance. The system will: 

- Summarize lengthy emails. 

- Generate reply suggestions. 

- Track email open status. 

- Detect email priorities. 

- Extract tasks and deadlines. 

- Generate follow-up reminders. 

- Detect spam emails. 

- Identify phishing links. 

The project scope is limited to browser-based email assistance. The system will not function as a standalone email platform and will not replace existing email services. 

## 1.3 Stakeholders 

- **Primary Stakeholders** 

- • Business Professionals • Corporate Employees • Marketing Executives • Sales Representatives • Researchers 

   - **Secondary Stakeholders** 

   - • System Administrators • Development Team • Academic Supervisors • Project Evaluators 

- Students 

## 2. Requirements Engineering Process 

## 2.1 Stakeholder Needs and Analysis 

## **Primary Stakeholder Needs** 

- Business professionals need faster methods to read and process large volumes of emails. 

- Corporate employees need assistance in identifying urgent emails and responding efficiently. 

- Users need protection against phishing attacks and spam emails. 

- Sales and marketing professionals need email tracking information to monitor recipient engagement. 

## **Secondary Stakeholder Needs** 

- Developers require a maintainable and scalable system architecture. 

- Project supervisors require a technically challenging yet feasible project demonstrating software engineering principles. 

## **Requirement Elicitation Methods** 

|**Method**|**Description**|
|---|---|
|**Interviews**|Interviews were conducted with students, professionals, and frequent email users<br>to identify common challenges in email communication.|
|**Surveys**|Online surveys were distributed to gather information regarding email management<br>difficulties, security concerns, and desired productivity features.|
|**Market Analysis**|Existing tools such as Grammarly, Mailtrack, Superhuman, and AI email assistants<br>were analyzed to identify useful features and project opportunities.|



## 2.2 List of Requirements 

## **Functional Requirements (FRs):** 

|ID|**Requirement**|**Description**|
|---|---|---|
|**FR1**|AI Email<br>Summarization|The system shall generate concise summaries of email<br>content.|
|**FR2**|Smart Reply<br>Suggestions|The system shall generate context-aware email reply<br>suggestions.|
|**FR3**|Email Open Tracking|The system shall track whether a recipient has opened an<br>email.|
|**FR4**|Priority Detection|The system shall classify emails into High, Medium, and Low<br>priority categories.|
|**FR5**|Task and Deadline<br>Extraction|The system shall identify tasks, action items, and deadlines<br>mentioned in emails.|
|**FR6**|Follow-Up Reminder<br>System|The system shall notify users when follow-up actions may be<br>required.|
|**FR7**|Spam Detection|The system shall analyse incoming emails and identify<br>potential spam messages.|
|**FR8**|Phishing Link<br>Detection|The system shall scan links within emails and warn users<br>about suspicious or potentially malicious URLs.|
|**FR9**|AI Email Draft<br>Generation|The system shall generate complete email drafts from user<br>prompts|
|**FR10**|Mail Statistics<br>Analysis|The system shall provide insights into user email behavious|



## **Non-Functional Requirements (NFRs):** 

|**ID**|**Requirement**|**Description**|
|---|---|---|
|**NFR1**|Security|User data and authentication information shall be securely<br>stored and transmitted.|
|**NFR2**|Performance|Email analysis results should be generated within five<br>seconds under normal operating conditions.|
|**NFR3**|Reliability|The extension should function consistently without<br>interrupting normal email usage.|
|**NFR4**|Compatibility|The extension should support modern Chromium-based<br>browsers and Gmail.|
|**NFR5**|Usability|Users should be able to access all major features through a<br>simple and intuitive interface.|



## **Extraordinary Requirements (Wow Factors):** 

|**ID**|**Feature**|**Description**|
|---|---|---|
|**ER1**|AI-Powered Email<br>Summarization|Automatically condenses lengthy emails into concise<br>summaries.|
|**ER2**|Real-Time Email Open<br>Tracking|The system provides immediate tracking information<br>whenever a recipient opens an email.|
|**ER3**|Integrated Phishing<br>Detection|Provides real-time security warnings for suspicious links<br>inside emails.|



## 2.3 House of Quality (QFD Integration) 

## **Customer Requirements (CRs):** 

|**ID**|**Customer Requirement**|
|---|---|
|**CR1**|Users need to read emails quickly.|
|**CR2**|Users want faster email responses.|
|**CR3**|Users need to know whether recipients opened their emails.|
|**CR4**|Users want important emails highlighted.|
|**CR5**|Users want automatic task identification.|
|**CR6**|Users need protection against spam emails.|
|**CR7**|Users need protection from phishing attacks.|
|**CR8**|Users require an easy-to-use email assistant.|
|**CR9**|Users want assistance in writing professional emails|
|**CR10**|Users want insights into their email activities|



## **Engineering Requirements (TRs):** 

|**ID**|**Technical Requirement**|
|---|---|
|**TR1**|AI-based summarization engine.|
|**TR2**|AI reply generation module.|
|**TR3**|Email tracking pixel implementation.|
|**TR4**|Priority classification engine.|
|**TR5**|Task extraction algorithm.|
|**TR6**|Spam detection module.|
|**TR7**|Phishing URL analysis engine.|
|**TR8**|Browser extension user interface.|
|**TR9**|AI draft generation module|
|**TR10**|Analytics and statistics engine|



## **QFD Matrix: House of Quality** 

|**Customer Requirements**<br>**(CRs)**|**Technical Requirements (TRs)**|**Relationship**<br>**(Strong/Medium/Weak)**|
|---|---|---|
|CR1: Read emails quickly|TR1: AI summarization engine|**Strong**|
|CR2: Faster responses|TR2: Reply generation module|**Strong**|
|CR3: Track recipient<br>engagement|TR3: Email tracking system|**Strong**|
|CR4: Highlight important<br>emails|TR4: Priority detection engine|**Strong**|
|CR5: Identify tasks<br>automatically|TR5: Task extraction algorithm|**Strong**|
|CR6: Detect spam emails|Spam detection module|**Strong**|
|CR7: Prevent phishing<br>attacks|TR7: Phishing detection module|**Strong**|
|CR8: Easy-to-use interface|TR8: Browser extension UI|**Medium**|
|CR9: Professional email<br>drafting|TR9: Draft generation module|**Strong**|
|CR10: Analyse email<br>activity|TR10: Statistics engine|**Strong**|



## 3. Requirements Modeling 

## 3.1 Use Case Diagrams 

Figure 01- Use Case Diagram 

## 3.2 Activity Diagrams 

Figure 02- Activity Diagram 

## 3.3 Sequence Diagrams 

Figure 03- Sequence Diagram 

