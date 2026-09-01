<!-- SOURCE: P1 -->
SOFTWARE REQUIREMENTSSPECIFICATION

<!-- SOURCE: P2 -->
HR Management & Employee Lifecycle Portal

<!-- SOURCE: P3 -->
End-to-end HRMS + Applicant Tracking + Attendance Platform

<!-- SOURCE: P4 -->
P5: Item

<!-- SOURCE: P5 -->
Item

<!-- SOURCE: P6 -->
Details

<!-- SOURCE: P7 -->
Document Version

<!-- SOURCE: P8 -->
1.1

<!-- SOURCE: P9 -->
Date

<!-- SOURCE: P10 -->
17 August 2026

<!-- SOURCE: P11 -->
Status

<!-- SOURCE: P12 -->
Baseline / Implementation Ready

<!-- SOURCE: P13 -->
Primary Users

<!-- SOURCE: P14 -->
HR, Recruiters, Interviewers, Managers, Employees, Administrators

<!-- SOURCE: P15 -->
Core Lifecycle

<!-- SOURCE: P16 -->
Candidate Intake -> Hiring -> Onboarding -> Employment -> Attendance -> Leave -> Payroll/Performance -> Exit

<!-- SOURCE: P17 -->
Primary Goal

<!-- SOURCE: P18 -->
Provide one controlled system of record for the employee lifecycle and the HR workflows around it.

<!-- SOURCE: P19 -->
P20: Core design principle: candidate data must transition into an employee record without unnecessary re-entry, while candidate interview attendance and employee attendance remain separate business processes.

<!-- SOURCE: P20 -->
Core design principle: candidate data must transition into an employee record without unnecessary re-entry, while candidate interview attendance and employee attendance remain separate business processes.

<!-- SOURCE: P21 -->
P22: Document Control

<!-- SOURCE: P22 -->
Document Control

<!-- SOURCE: P23 -->
Version

<!-- SOURCE: P24 -->
Date

<!-- SOURCE: P25 -->
Author / Owner

<!-- SOURCE: P26 -->
Description

<!-- SOURCE: P27 -->
1.1

<!-- SOURCE: P28 -->
17 Aug 2026

<!-- SOURCE: P29 -->
Project Team

<!-- SOURCE: P30 -->
Initial comprehensive SRS based on the agreed HR portal scope.

<!-- SOURCE: P31 -->
1.1

<!-- SOURCE: P32 -->
TBD

<!-- SOURCE: P33 -->
Project Team

<!-- SOURCE: P34 -->
Future change requests / approved revisions.

<!-- SOURCE: P35 -->
P36: Approval Matrix

<!-- SOURCE: P36 -->
Approval Matrix

<!-- SOURCE: P37 -->
Role

<!-- SOURCE: P38 -->
Approval Responsibility

<!-- SOURCE: P39 -->
Business Owner / HR Head

<!-- SOURCE: P40 -->
Business scope, policies, approval workflows

<!-- SOURCE: P41 -->
Product Owner

<!-- SOURCE: P42 -->
Functional scope, priorities, acceptance criteria

<!-- SOURCE: P43 -->
Technical Lead

<!-- SOURCE: P44 -->
Architecture, security, integrations, data model

<!-- SOURCE: P45 -->
QA Lead

<!-- SOURCE: P46 -->
Test coverage, acceptance validation, release readiness

<!-- SOURCE: P47 -->
P48: Table of Contents

<!-- SOURCE: P48 -->
Table of Contents

<!-- SOURCE: P49 -->
1. Introduction

<!-- SOURCE: P50 -->
2. Product Vision and Objectives

<!-- SOURCE: P51 -->
3. Scope

<!-- SOURCE: P52 -->
4. Stakeholders, Roles and Permissions

<!-- SOURCE: P53 -->
5. High-Level Business Workflow

<!-- SOURCE: P54 -->
6. Functional Requirements

<!-- SOURCE: P55 -->
7. Forms and Candidate Intake

<!-- SOURCE: P56 -->
8. Recruitment and ATS

<!-- SOURCE: P57 -->
9. Interview Management

<!-- SOURCE: P58 -->
10. Candidate Attendance and Visitor Management

<!-- SOURCE: P59 -->
11. Offer and Hiring

<!-- SOURCE: P60 -->
12. Employee Management and Onboarding

<!-- SOURCE: P61 -->
13. Employee Attendance

<!-- SOURCE: P62 -->
14. Leave Management

<!-- SOURCE: P63 -->
15. Payroll and Expenses

<!-- SOURCE: P64 -->
16. Performance and Learning

<!-- SOURCE: P65 -->
17. Asset Management

<!-- SOURCE: P66 -->
18. Document Management

<!-- SOURCE: P67 -->
19. HR Helpdesk and Requests

<!-- SOURCE: P68 -->
20. Notifications and Automation

<!-- SOURCE: P69 -->
21. Reports and Analytics

<!-- SOURCE: P70 -->
22. Offboarding and Exit Management

<!-- SOURCE: P71 -->
23. Compliance, Audit and Security

<!-- SOURCE: P72 -->
24. Multi-Tenant / Organization Architecture

<!-- SOURCE: P73 -->
25. Data Requirements

<!-- SOURCE: P74 -->
26. API and Integration Requirements

<!-- SOURCE: P75 -->
26.3 Recommended Technology Stack

<!-- SOURCE: P76 -->
26.3 Recommended Technology Stack

<!-- SOURCE: P77 -->
The recommended implementation SHALL use a TypeScript-first modular monolith for the initial production release. Domain boundaries SHALL remain explicit so modules can be extracted into separate services later if scale, integrations, or organizational needs require it.

<!-- SOURCE: P78 -->
26.3.1 Core Stack

<!-- SOURCE: P79 -->
Frontend: Next.js, React and TypeScript.

<!-- SOURCE: P80 -->
UI system: Tailwind CSS, shadcn/ui, Radix UI and Lucide icons.

<!-- SOURCE: P81 -->
Client data/state: TanStack Query for server state and Zustand for lightweight client state.

<!-- SOURCE: P82 -->
Forms and validation: React Hook Form and Zod, including reusable schema-driven HR forms.

<!-- SOURCE: P83 -->
Backend: Next.js Route Handlers for V1, organized into controllers/routes, services, repositories and domain modules. A dedicated NestJS API may be introduced later if external clients or service separation justify it.

<!-- SOURCE: P84 -->
Database: PostgreSQL as the transactional system of record, accessed through Prisma ORM.

<!-- SOURCE: P85 -->
Authentication: Better Auth or Auth.js with session management, RBAC, granular permissions and MFA-ready architecture.

<!-- SOURCE: P86 -->
Caching and background processing: Redis and BullMQ.

<!-- SOURCE: P87 -->
File/document storage: Amazon S3 or another S3-compatible private object store such as Cloudflare R2.

<!-- SOURCE: P88 -->
Email: Resend or Amazon SES; SMS/WhatsApp can be added through approved providers later.

<!-- SOURCE: P89 -->
Calendar integration: Google Calendar and Microsoft Graph/Outlook where required.

<!-- SOURCE: P90 -->
Testing: Vitest for unit/API tests and Playwright for end-to-end workflow tests.

<!-- SOURCE: P91 -->
Observability: Sentry and OpenTelemetry, with centralized logs and health/readiness endpoints.

<!-- SOURCE: P92 -->
DevOps: Git, GitHub, GitHub Actions and Docker; deployment can begin on managed hosting and move to AWS or another cloud platform without architectural redesign.

<!-- SOURCE: P93 -->
AI: isolated AI service/module for resume parsing, candidate matching, interview assistance and HR analytics; AI SHALL remain human-in-the-loop for employment decisions.

<!-- SOURCE: P94 -->
Layer

<!-- SOURCE: P95 -->
Recommended Technology

<!-- SOURCE: P96 -->
Primary Responsibility

<!-- SOURCE: P97 -->
Selection Rationale

<!-- SOURCE: P98 -->
Frontend

<!-- SOURCE: P99 -->
Next.js, React, TypeScript

<!-- SOURCE: P100 -->
HR admin, recruiter, manager, interviewer and employee web experiences

<!-- SOURCE: P101 -->
Unified routing, strong TypeScript support, server/client rendering, and a mature React ecosystem.

<!-- SOURCE: P102 -->
UI / Design System

<!-- SOURCE: P103 -->
Tailwind CSS, shadcn/ui, Radix UI, Lucide

<!-- SOURCE: P104 -->
Enterprise dashboard, forms, tables, dialogs and accessible primitives

<!-- SOURCE: P105 -->
Fast delivery with consistent design tokens and accessible components.

<!-- SOURCE: P106 -->
Client Data

<!-- SOURCE: P107 -->
TanStack Query, Zustand

<!-- SOURCE: P108 -->
Server-state fetching/caching and limited client-only state

<!-- SOURCE: P109 -->
Predictable API state with minimal global state.

<!-- SOURCE: P110 -->
Forms / Validation

<!-- SOURCE: P111 -->
React Hook Form, Zod

<!-- SOURCE: P112 -->
Complex HR forms, conditional fields and validation

<!-- SOURCE: P113 -->
Strong fit for configurable forms and shared validation.

<!-- SOURCE: P114 -->
Backend / API

<!-- SOURCE: P115 -->
Next.js Route Handlers + domain service layer; NestJS as future extraction option

<!-- SOURCE: P116 -->
Versioned APIs, business logic and integrations

<!-- SOURCE: P117 -->
Simple V1 deployment while preserving clean boundaries for future scale.

<!-- SOURCE: P118 -->
Database

<!-- SOURCE: P119 -->
PostgreSQL

<!-- SOURCE: P120 -->
Primary transactional datastore

<!-- SOURCE: P121 -->
Strong relational integrity for employees, candidates, applications, attendance, leave, payroll and audit records.

<!-- SOURCE: P122 -->
ORM

<!-- SOURCE: P123 -->
Prisma

<!-- SOURCE: P124 -->
Type-safe database access and migrations

<!-- SOURCE: P125 -->
Strong TypeScript integration and explicit relational modeling.

<!-- SOURCE: P126 -->
Cache / Queue

<!-- SOURCE: P127 -->
Redis + BullMQ

<!-- SOURCE: P128 -->
Caching, rate limiting, scheduled work and durable background jobs

<!-- SOURCE: P129 -->
Suitable for reminders, email, workflows, notifications and asynchronous processing.

<!-- SOURCE: P130 -->
Object Storage

<!-- SOURCE: P131 -->
Amazon S3 or S3-compatible storage such as Cloudflare R2

<!-- SOURCE: P132 -->
Resumes, employee documents, payslips and attachments

<!-- SOURCE: P133 -->
Private object storage with signed access and lifecycle controls.

<!-- SOURCE: P134 -->
Authentication

<!-- SOURCE: P135 -->
Better Auth or Auth.js

<!-- SOURCE: P136 -->
Sessions, login, OAuth/OIDC foundations and authentication flows

<!-- SOURCE: P137 -->
Good web authentication base with an upgrade path to enterprise SSO.

<!-- SOURCE: P138 -->
Authorization

<!-- SOURCE: P139 -->
RBAC + granular permission matrix

<!-- SOURCE: P140 -->
Role and resource/action access control

<!-- SOURCE: P141 -->
Supports HR Admin, Recruiter, Interviewer, Manager, Employee and custom roles.

<!-- SOURCE: P142 -->
Search

<!-- SOURCE: P143 -->
PostgreSQL Full-Text Search initially; OpenSearch later if required

<!-- SOURCE: P144 -->
Candidate, employee and job search

<!-- SOURCE: P145 -->
Avoids premature infrastructure while leaving a clear path for advanced search.

<!-- SOURCE: P146 -->
Notifications

<!-- SOURCE: P147 -->
Amazon SES or Resend + in-app notification service

<!-- SOURCE: P148 -->
Interview, offer, onboarding, attendance, leave and HR alerts

<!-- SOURCE: P149 -->
Reliable transactional messaging with centralized templates and auditability.

<!-- SOURCE: P150 -->
Calendar

<!-- SOURCE: P151 -->
Google Calendar API + Microsoft Graph

<!-- SOURCE: P152 -->
Interview scheduling and meeting invitations

<!-- SOURCE: P153 -->
Supports common enterprise calendar ecosystems.

<!-- SOURCE: P154 -->
Testing

<!-- SOURCE: P155 -->
Vitest + Playwright

<!-- SOURCE: P156 -->
Unit/API and end-to-end workflow testing

<!-- SOURCE: P157 -->
Covers domain behavior and critical lifecycle workflows.

<!-- SOURCE: P158 -->
Observability

<!-- SOURCE: P159 -->
Sentry + OpenTelemetry

<!-- SOURCE: P160 -->
Errors, traces, latency and service health

<!-- SOURCE: P161 -->
Production troubleshooting and operational visibility.

<!-- SOURCE: P162 -->
DevOps

<!-- SOURCE: P163 -->
GitHub Actions + Docker

<!-- SOURCE: P164 -->
CI/CD, repeatable builds and deployment

<!-- SOURCE: P165 -->
Automated pipeline with environment consistency.

<!-- SOURCE: P166 -->
Deployment

<!-- SOURCE: P167 -->
Vercel + managed PostgreSQL/Redis initially; AWS for larger enterprise deployments

<!-- SOURCE: P168 -->
Hosting and infrastructure

<!-- SOURCE: P169 -->
Fast initial delivery with a scalable cloud path.

<!-- SOURCE: P170 -->
AI Extension

<!-- SOURCE: P171 -->
Dedicated AI service/adapter layer connected to approved LLM providers

<!-- SOURCE: P172 -->
Resume parsing, summarization, candidate matching and HR assistant capabilities

<!-- SOURCE: P173 -->
Keeps AI dependencies isolated and subject to authorization/privacy controls.

<!-- SOURCE: P174 -->
26.3.2 Recommended Application Architecture

<!-- SOURCE: P175 -->
The application SHOULD be implemented as a modular monolith for V1, with domain modules separated by clear service/repository boundaries.

<!-- SOURCE: P176 -->
Recommended request flow: UI → API/Route Handler → Authorization → Validation → Domain Service → Repository/Prisma → PostgreSQL.

<!-- SOURCE: P177 -->
Background flow: Domain event/task → Redis/BullMQ → Worker → External provider or downstream operation → status/audit record.

<!-- SOURCE: P178 -->
File flow: Client upload → validated upload endpoint → private object storage → document metadata stored in PostgreSQL.

<!-- SOURCE: P179 -->
The system SHALL keep candidate attendance and employee attendance as separate business concepts, even if they share infrastructure and reporting primitives.

<!-- SOURCE: P180 -->
26.3.3 Core Domain Modules

<!-- SOURCE: P181 -->
Identity & Access Management

<!-- SOURCE: P182 -->
Organizations / Multi-Tenancy

<!-- SOURCE: P183 -->
Recruitment / ATS

<!-- SOURCE: P184 -->
Candidate & Application Management

<!-- SOURCE: P185 -->
Interview Management

<!-- SOURCE: P186 -->
Offers & Hiring

<!-- SOURCE: P187 -->
Employee Management

<!-- SOURCE: P188 -->
Onboarding

<!-- SOURCE: P189 -->
Candidate Attendance / Visitor Management

<!-- SOURCE: P190 -->
Employee Attendance / Shifts / Timesheets

<!-- SOURCE: P191 -->
Leave Management

<!-- SOURCE: P192 -->
Payroll & Compensation

<!-- SOURCE: P193 -->
Expenses & Reimbursements

<!-- SOURCE: P194 -->
Performance Management

<!-- SOURCE: P195 -->
Learning & Certifications

<!-- SOURCE: P196 -->
Assets

<!-- SOURCE: P197 -->
Documents & Forms

<!-- SOURCE: P198 -->
Helpdesk / HR Requests

<!-- SOURCE: P199 -->
Notifications & Workflow Automation

<!-- SOURCE: P200 -->
Reports & Analytics

<!-- SOURCE: P201 -->
Offboarding / Exit Management

<!-- SOURCE: P202 -->
Compliance / Audit

<!-- SOURCE: P203 -->
26.3.4 Technology Standards

<!-- SOURCE: P204 -->
TypeScript SHALL be the default language across frontend and backend application code.

<!-- SOURCE: P205 -->
PostgreSQL SHALL be the system of record for transactional HR data; SQLite SHALL not be used for production multi-user deployment.

<!-- SOURCE: P206 -->
Secrets and API credentials SHALL be stored in environment/secret management systems and SHALL never be committed to source control.

<!-- SOURCE: P207 -->
All APIs SHALL use schema validation, authentication, authorization, organization scoping and consistent error responses.

<!-- SOURCE: P208 -->
Sensitive documents SHALL be stored privately and accessed through time-limited signed URLs or equivalent authorization-controlled mechanisms.

<!-- SOURCE: P209 -->
Long-running or retryable operations SHALL use durable background jobs rather than blocking web requests.

<!-- SOURCE: P210 -->
Critical lifecycle workflows SHALL have automated end-to-end tests, especially candidate submission → interview → offer → employee conversion → attendance.

<!-- SOURCE: P211 -->
The stack SHALL support containerized deployment so application services can move between managed hosting and cloud infrastructure without codebase redesign.

<!-- SOURCE: P212 -->
26.3.5 Recommended Environment Strategy

<!-- SOURCE: P213 -->
Development: local Next.js application, local or managed PostgreSQL, local Redis, and development object storage.

<!-- SOURCE: P214 -->
Staging: production-like configuration with isolated database, Redis, storage bucket and external integration credentials.

<!-- SOURCE: P215 -->
Production: managed PostgreSQL, managed Redis, private object storage, centralized monitoring, automated backups and controlled secrets.

<!-- SOURCE: P216 -->
27. Non-Functional Requirements

<!-- SOURCE: P217 -->
28. UX / UI Requirements

<!-- SOURCE: P218 -->
29. Reporting KPIs

<!-- SOURCE: P219 -->
30. Acceptance Criteria

<!-- SOURCE: P220 -->
31. Implementation Roadmap

<!-- SOURCE: P221 -->
31.1 Vibe-Coding Implementation Strategy

<!-- SOURCE: P222 -->
The portal SHALL be implemented incrementally using AI-assisted/vibe coding. AI coding tools may generate code, tests and documentation, but the SRS, architecture rules, database migrations, permissions and acceptance criteria remain the source of truth. The coding agent SHALL work only on the authorized phase and SHALL not silently redesign unrelated modules.

<!-- SOURCE: P223 -->
31.2 Source-of-Truth Documents

<!-- SOURCE: P224 -->
01_SRS.md: functional and non-functional requirements, business rules, roles, workflows and acceptance criteria.

<!-- SOURCE: P225 -->
02_ARCHITECTURE.md: project structure, domain boundaries, request flow, database conventions, security rules and technology standards.

<!-- SOURCE: P226 -->
03_IMPLEMENTATION_PLAN.md: ordered phases, dependencies, current status, known issues and completion criteria.

<!-- SOURCE: P227 -->
31.3 AI Coding Rules

<!-- SOURCE: P228 -->
Before modifying code, the AI coding agent SHALL inspect the relevant SRS requirements, existing architecture and current implementation.

<!-- SOURCE: P229 -->
The agent SHALL implement one defined phase or task at a time and SHALL avoid unrelated refactors unless explicitly required for correctness or security.

<!-- SOURCE: P230 -->
Business logic SHALL remain in domain/service layers; React components SHALL not contain direct database access.

<!-- SOURCE: P231 -->
No hardcoded production/business data, fake APIs, placeholder success responses or mock workflows SHALL be introduced into production paths.

<!-- SOURCE: P232 -->
All database changes SHALL use reviewed, repeatable migrations and appropriate seed data SHALL be clearly separated from production data.

<!-- SOURCE: P233 -->
All new endpoints SHALL implement authentication, authorization, organization scoping, input validation and consistent errors where applicable.

<!-- SOURCE: P234 -->
Existing workflows and API contracts SHALL not be changed silently; breaking changes SHALL be documented in the implementation notes.

<!-- SOURCE: P235 -->
The AI agent SHALL run type checking, linting, automated tests and a production build after each completed phase. Failures SHALL be fixed before the phase is marked complete.

<!-- SOURCE: P236 -->
Sensitive HR data SHALL never be copied into prompts, logs or test fixtures unnecessarily; secrets SHALL never be committed to source control.

<!-- SOURCE: P237 -->
31.4 Phase-Based Delivery Plan

<!-- SOURCE: P238 -->
Phase 0 - Foundation: repository setup, Next.js/TypeScript, UI system, PostgreSQL/Prisma, authentication, organization model, RBAC, API conventions, error handling, logging and testing baseline.

<!-- SOURCE: P239 -->
Phase 1 - Recruitment Foundation: job requisitions, online hiring form, walk-in form, candidate profile, candidate documents, application intake and status history.

<!-- SOURCE: P240 -->
Phase 2 - ATS: screening, shortlist, pipeline/Kanban, filtering, search, candidate timeline, notes and recruitment dashboards.

<!-- SOURCE: P241 -->
Phase 3 - Interviews: rounds, scheduling, interviewers, scorecards, evaluations, recommendations, reminders and rescheduling.

<!-- SOURCE: P242 -->
Phase 4 - Candidate Attendance and Hiring: candidate check-in/out, no-show tracking, offers, approval, offer acceptance and candidate-to-employee conversion.

<!-- SOURCE: P243 -->
Phase 5 - Employee Lifecycle: employee profiles, departments, designations, onboarding, document collection, employee history and onboarding checklists.

<!-- SOURCE: P244 -->
Phase 6 - Employee Attendance: check-in/out, shifts, holidays, overtime, corrections, timesheets and attendance reporting.

<!-- SOURCE: P245 -->
Phase 7 - Leave: leave types, policies, balances, requests, approvals, calendars and integrations with attendance.

<!-- SOURCE: P246 -->
Phase 8 - Documents and Notifications: secure document management, expiry alerts, email, in-app notifications and task/reminder center.

<!-- SOURCE: P247 -->
Phase 9 - Payroll: salary structures, payroll runs, payslips, reimbursements and payroll approvals, subject to applicable statutory requirements.

<!-- SOURCE: P248 -->
Phase 10 - Performance, Assets and Learning: goals, reviews, assets, training, certifications and employee development.

<!-- SOURCE: P249 -->
Phase 11 - Analytics: recruitment, workforce, attendance, leave, payroll and HR operational dashboards with drill-down.

<!-- SOURCE: P250 -->
Phase 12 - Exit and Compliance: resignation, notice, clearance, asset return, access revocation, final settlement, exit documents and compliance/audit reporting.

<!-- SOURCE: P251 -->
Phase 13 - AI and Advanced Integrations: resume parsing, candidate matching, HR assistant, calendar integrations, biometric providers, accounting/payroll integrations and workflow automation.

<!-- SOURCE: P252 -->
31.5 Definition of Done for Each Vibe-Coding Phase

<!-- SOURCE: P253 -->
Functional implementation matches the SRS and acceptance criteria.

<!-- SOURCE: P254 -->
Database schema and migrations are complete and reviewed.

<!-- SOURCE: P255 -->
Required APIs are implemented, validated and permission-protected.

<!-- SOURCE: P256 -->
Frontend flows work on desktop and mobile/responsive layouts.

<!-- SOURCE: P257 -->
Loading, empty, validation, error and success states are implemented.

<!-- SOURCE: P258 -->
Automated tests cover critical business rules and the main workflow.

<!-- SOURCE: P259 -->
Type checking, linting and production build pass.

<!-- SOURCE: P260 -->
No hardcoded dummy business data remains in production paths.

<!-- SOURCE: P261 -->
Changed files, migrations, APIs, known limitations and follow-up work are documented.

<!-- SOURCE: P262 -->
32. Assumptions and Open Decisions

<!-- SOURCE: P263 -->
P264: 1. Introduction

<!-- SOURCE: P264 -->
1. Introduction

<!-- SOURCE: P265 -->
1.1 Purpose

<!-- SOURCE: P266 -->
This Software Requirements Specification (SRS) defines the requirements for a web-based Human Resources Management and Employee Lifecycle Portal. The platform is intended to provide HR teams with a single system to capture, manage, track, approve, report on, and audit employment-related workflows from initial candidate contact through hiring, employment operations, and employee exit.

<!-- SOURCE: P267 -->
The SRS is written as an implementation baseline for product, UX, frontend, backend, database, QA, security, and deployment teams. It separates mandatory functional requirements from future enhancements and identifies key entities, workflows, permissions, data, interfaces, and non-functional expectations.

<!-- SOURCE: P268 -->
1.2 Product Definition

<!-- SOURCE: P269 -->
The product combines HRMS and ATS capabilities. It has two interconnected domains: (1) Recruitment / Candidate Lifecycle and (2) Employee Lifecycle / HR Operations. A candidate can be converted into an employee while preserving approved information and maintaining an auditable relationship between the candidate application, interview decisions, offer, and resulting employee record.

<!-- SOURCE: P270 -->
1.3 Key Terms

<!-- SOURCE: P271 -->
Term

<!-- SOURCE: P272 -->
Meaning

<!-- SOURCE: P273 -->
ATS

<!-- SOURCE: P274 -->
Applicant Tracking System used to manage jobs, applications, candidates, interviews and offers.

<!-- SOURCE: P275 -->
HRMS

<!-- SOURCE: P276 -->
Human Resources Management System used to manage employee lifecycle and HR operations.

<!-- SOURCE: P277 -->
Candidate

<!-- SOURCE: P278 -->
A person who applies, is referred, walks into the company, or is otherwise considered for employment.

<!-- SOURCE: P279 -->
Walk-in

<!-- SOURCE: P280 -->
A candidate who physically visits the organization and is registered by HR/reception.

<!-- SOURCE: P281 -->
Employee

<!-- SOURCE: P282 -->
A person formally hired and activated in the employee master.

<!-- SOURCE: P283 -->
Form

<!-- SOURCE: P284 -->
A configurable data collection interface that can be published online, used internally, printed, and downloaded as PDF.

<!-- SOURCE: P285 -->
RBAC

<!-- SOURCE: P286 -->
Role-Based Access Control.

<!-- SOURCE: P287 -->
Audit Log

<!-- SOURCE: P288 -->
Immutable or append-only record of significant system and data changes.

<!-- SOURCE: P289 -->
Workflow

<!-- SOURCE: P290 -->
A sequence of states, actions, approvals, notifications, or automation triggered by a business event.

<!-- SOURCE: P291 -->
P292: 2. Product Vision and Objectives

<!-- SOURCE: P292 -->
2. Product Vision and Objectives

<!-- SOURCE: P293 -->
Create one authoritative source of HR and employment lifecycle data.

<!-- SOURCE: P294 -->
Reduce manual HR administration and duplicate data entry.

<!-- SOURCE: P295 -->
Provide a transparent and trackable recruitment pipeline from application through hiring.

<!-- SOURCE: P296 -->
Allow HR to publish online hiring forms and record walk-in candidates using standardized forms.

<!-- SOURCE: P297 -->
Capture candidate interview outcomes and candidate attendance without mixing them with employee attendance.

<!-- SOURCE: P298 -->
Allow selected candidates to be converted into employees with controlled data reuse.

<!-- SOURCE: P299 -->
Provide accurate attendance, leave, onboarding, document, payroll-supporting, performance, and exit workflows.

<!-- SOURCE: P300 -->
Give HR timely dashboards, alerts, approvals, reports, and audit history.

<!-- SOURCE: P301 -->
Protect sensitive employee and candidate data through least-privilege access, encryption, auditability, and secure document handling.

<!-- SOURCE: P302 -->
Provide an extensible foundation for future integrations, mobile use, automation, and AI-assisted HR operations.

<!-- SOURCE: P303 -->
3. Scope

<!-- SOURCE: P304 -->
3.1 In Scope - Core Release

<!-- SOURCE: P305 -->
Authentication, session management, organization context and RBAC.

<!-- SOURCE: P306 -->
HR dashboard and action center.

<!-- SOURCE: P307 -->
Form builder and form publishing.

<!-- SOURCE: P308 -->
Public online hiring application form.

<!-- SOURCE: P309 -->
Internal walk-in candidate form.

<!-- SOURCE: P310 -->
Candidate profile and candidate database.

<!-- SOURCE: P311 -->
Job requisitions and job postings.

<!-- SOURCE: P312 -->
Application pipeline / ATS.

<!-- SOURCE: P313 -->
Interview scheduling, scorecards and recommendations.

<!-- SOURCE: P314 -->
Candidate attendance / visitor check-in and no-show tracking.

<!-- SOURCE: P315 -->
Hiring decision, offer workflow and candidate-to-employee conversion.

<!-- SOURCE: P316 -->
Employee master and profile management.

<!-- SOURCE: P317 -->
Onboarding workflows and checklists.

<!-- SOURCE: P318 -->
Employee attendance, shifts and timesheets.

<!-- SOURCE: P319 -->
Leave requests, balances, policies and approvals.

<!-- SOURCE: P320 -->
Document repository and controlled downloads.

<!-- SOURCE: P321 -->
Notifications, reminders and task management.

<!-- SOURCE: P322 -->
Reports, analytics, exports and audit logs.

<!-- SOURCE: P323 -->
Offboarding / exit workflow.

<!-- SOURCE: P324 -->
3.2 Planned / Extensible Modules

<!-- SOURCE: P325 -->
Payroll

<!-- SOURCE: P326 -->
Expenses and reimbursements

<!-- SOURCE: P327 -->
Performance management

<!-- SOURCE: P328 -->
Learning and development

<!-- SOURCE: P329 -->
Asset management

<!-- SOURCE: P330 -->
HR helpdesk

<!-- SOURCE: P331 -->
Advanced workflow automation

<!-- SOURCE: P332 -->
External calendar / email integrations

<!-- SOURCE: P333 -->
Biometric attendance integrations

<!-- SOURCE: P334 -->
Digital signatures

<!-- SOURCE: P335 -->
AI-assisted candidate matching and HR analytics

<!-- SOURCE: P336 -->
4. Stakeholders, Roles and Permissions

<!-- SOURCE: P337 -->
Role

<!-- SOURCE: P338 -->
Primary Area

<!-- SOURCE: P339 -->
Expected Access

<!-- SOURCE: P340 -->
Super Administrator

<!-- SOURCE: P341 -->
Platform / tenant administration

<!-- SOURCE: P342 -->
Organizations, global settings, system-level access, audit and security configuration.

<!-- SOURCE: P343 -->
Organization Administrator

<!-- SOURCE: P344 -->
Company administration

<!-- SOURCE: P345 -->
Organization settings, users, roles, policies, departments, master data.

<!-- SOURCE: P346 -->
HR Administrator

<!-- SOURCE: P347 -->
HR operations

<!-- SOURCE: P348 -->
Full HR workflows, employee records, recruitment, attendance, leave, documents, reports.

<!-- SOURCE: P349 -->
HR Manager

<!-- SOURCE: P350 -->
HR management

<!-- SOURCE: P351 -->
Approvals, reporting, workforce and recruitment oversight; configurable access to sensitive fields.

<!-- SOURCE: P352 -->
Recruiter

<!-- SOURCE: P353 -->
Recruitment

<!-- SOURCE: P354 -->
Jobs, candidates, applications, interview scheduling, candidate notes and offers within permission scope.

<!-- SOURCE: P355 -->
Interviewer

<!-- SOURCE: P356 -->
Interview evaluation

<!-- SOURCE: P357 -->
Assigned candidate records, interview schedule, evaluation forms and recommendations.

<!-- SOURCE: P358 -->
Hiring Manager

<!-- SOURCE: P359 -->
Hiring decisions

<!-- SOURCE: P360 -->
Job requisitions, shortlist review, interview feedback, approvals for assigned positions.

<!-- SOURCE: P361 -->
Manager

<!-- SOURCE: P362 -->
Team management

<!-- SOURCE: P363 -->
Team attendance, leave approvals, performance and limited employee information.

<!-- SOURCE: P364 -->
Employee

<!-- SOURCE: P365 -->
Self-service

<!-- SOURCE: P366 -->
Own profile, attendance, leave, documents, requests and authorized self-service functions.

<!-- SOURCE: P367 -->
Reception / Front Desk

<!-- SOURCE: P368 -->
Walk-in operations

<!-- SOURCE: P369 -->
Visitor / candidate registration, check-in/out, appointment lookup; no access to confidential HR fields unless granted.

<!-- SOURCE: P370 -->
Finance / Payroll

<!-- SOURCE: P371 -->
Financial HR operations

<!-- SOURCE: P372 -->
Payroll-supporting data, expenses, reimbursements and salary information according to policy.

<!-- SOURCE: P373 -->
Auditor / Compliance

<!-- SOURCE: P374 -->
Read-only oversight

<!-- SOURCE: P375 -->
Audit logs, reports, policy and compliance evidence according to scope.

<!-- SOURCE: P376 -->
P377: 4.1 Permission Model

<!-- SOURCE: P377 -->
4.1 Permission Model

<!-- SOURCE: P378 -->
Permissions SHALL be action-based (view, create, update, approve, export, download, delete/archive) and resource-based.

<!-- SOURCE: P379 -->
Sensitive attributes such as salary, bank data, government IDs and confidential documents SHALL support field/document-level access rules where required.

<!-- SOURCE: P380 -->
The system SHALL deny access by default and grant only explicitly assigned permissions.

<!-- SOURCE: P381 -->
Approval permissions SHALL be distinguishable from edit permissions.

<!-- SOURCE: P382 -->
Export/download access SHALL be independently permissioned because downloads can create data leakage risk.

<!-- SOURCE: P383 -->
5. High-Level Business Workflow

<!-- SOURCE: P384 -->
The primary lifecycle is designed as a controlled state machine rather than a collection of disconnected screens.

<!-- SOURCE: P385 -->
Lifecycle Stage

<!-- SOURCE: P386 -->
Primary States / Events

<!-- SOURCE: P387 -->
Key Output

<!-- SOURCE: P388 -->
Candidate Intake

<!-- SOURCE: P389 -->
Online Apply / Walk-in / Referral / Import

<!-- SOURCE: P390 -->
Candidate profile + application

<!-- SOURCE: P391 -->
Screening

<!-- SOURCE: P392 -->
New / Screening / Shortlisted / On Hold / Rejected

<!-- SOURCE: P393 -->
Screening decision + notes

<!-- SOURCE: P394 -->
Interview

<!-- SOURCE: P395 -->
Scheduled / Checked-in / Completed / No-show / Rescheduled

<!-- SOURCE: P396 -->
Interview evaluation + recommendation

<!-- SOURCE: P397 -->
Hiring

<!-- SOURCE: P398 -->
Selected / Offer Draft / Approval / Sent / Accepted / Declined

<!-- SOURCE: P399 -->
Approved offer + hiring decision

<!-- SOURCE: P400 -->
Onboarding

<!-- SOURCE: P401 -->
Pre-joining / In Progress / Completed / Blocked

<!-- SOURCE: P402 -->
Employee activation readiness

<!-- SOURCE: P403 -->
Employment

<!-- SOURCE: P404 -->
Active / Probation / Confirmed / Transferred / Promoted

<!-- SOURCE: P405 -->
Employee master + employment history

<!-- SOURCE: P406 -->
Attendance

<!-- SOURCE: P407 -->
Present / Absent / Late / WFH / On Duty / Overtime / Leave

<!-- SOURCE: P408 -->
Daily attendance records

<!-- SOURCE: P409 -->
HR Operations

<!-- SOURCE: P410 -->
Leave / Documents / Requests / Payroll / Performance / Training

<!-- SOURCE: P411 -->
Continuous employee service record

<!-- SOURCE: P412 -->
Exit

<!-- SOURCE: P413 -->
Resignation / Notice / Clearance / Final Settlement / Exited

<!-- SOURCE: P414 -->
Closed employment record + exit evidence

<!-- SOURCE: P415 -->
P416: 6. Functional Requirements

<!-- SOURCE: P416 -->
6. Functional Requirements

<!-- SOURCE: P417 -->
The following requirements use priority labels: Must = required for the intended product baseline; Should = strongly recommended for the first production releases; Could = optional enhancement.

<!-- SOURCE: P418 -->
FR-001 - Authentication: The system shall provide secure sign-in, sign-out, session expiration, password reset and configurable MFA/2FA support. [Must]

<!-- SOURCE: P419 -->
FR-002 - Organization Context: Every business record shall belong to an organization/tenant, with server-side organization isolation enforced for all protected APIs. [Must]

<!-- SOURCE: P420 -->
FR-003 - RBAC: The system shall support role-based permissions and permission inheritance/custom roles. [Must]

<!-- SOURCE: P421 -->
FR-004 - Global Search: Authorized users shall be able to search across candidates, employees, jobs, interviews, documents, requests and tickets. [Must]

<!-- SOURCE: P422 -->
FR-005 - Activity Timeline: Candidate and employee profiles shall show chronological business events with actor, timestamp and relevant detail. [Must]

<!-- SOURCE: P423 -->
FR-006 - Audit Logging: Sensitive create/update/delete/approve/export/download actions shall generate audit events. [Must]

<!-- SOURCE: P424 -->
7. Forms and Candidate Intake

<!-- SOURCE: P425 -->
7.1 Online Hiring Form

<!-- SOURCE: P426 -->
HR shall create a job-linked public application form.

<!-- SOURCE: P427 -->
The form shall collect configurable personal, contact, address, education, employment, skills, expected compensation, notice period, source, declaration and consent data.

<!-- SOURCE: P428 -->
The form shall support resume/CV and supporting document uploads subject to validation rules.

<!-- SOURCE: P429 -->
The application URL SHALL be publicly shareable without exposing administrative screens.

<!-- SOURCE: P430 -->
Submitted applications SHALL automatically create or match a candidate and create an application against the selected job/requisition.

<!-- SOURCE: P431 -->
The form shall support required fields, validation, conditional fields and anti-abuse protection.

<!-- SOURCE: P432 -->
A candidate submission confirmation SHALL be displayed and optionally emailed.

<!-- SOURCE: P433 -->
7.2 Walk-in Form

<!-- SOURCE: P434 -->
HR/reception shall create a candidate record through an internal walk-in form.

<!-- SOURCE: P435 -->
The form shall capture candidate identity, contact details, role of interest, experience, source, resume and visit details.

<!-- SOURCE: P436 -->
The system SHALL support candidate check-in and check-out associated with the walk-in visit.

<!-- SOURCE: P437 -->
A printable/downloadable copy SHALL be available after submission.

<!-- SOURCE: P438 -->
HR SHALL be able to convert a walk-in record into a normal application against an open requisition without re-entering the candidate data.

<!-- SOURCE: P439 -->
7.3 Form Download / Print

<!-- SOURCE: P440 -->
Both the online hiring form submission and walk-in form submission SHALL be rendered into a consistent printable format.

<!-- SOURCE: P441 -->
Authorized users SHALL be able to download PDF copies of the submitted form.

<!-- SOURCE: P442 -->
Downloaded PDFs SHALL contain form metadata, submission date/time and a unique submission/reference number.

<!-- SOURCE: P443 -->
Document download events SHALL be audited when the form contains sensitive data.

<!-- SOURCE: P444 -->
7.4 Form Builder

<!-- SOURCE: P445 -->
Capability

<!-- SOURCE: P446 -->
Requirement

<!-- SOURCE: P447 -->
Field Types

<!-- SOURCE: P448 -->
Text, number, email, phone, date/time, dropdown, multi-select, radio, checkbox, file, signature, address, rich text/instructions.

<!-- SOURCE: P449 -->
Validation

<!-- SOURCE: P450 -->
Required/optional, length, pattern, numeric/date rules and file type/size constraints.

<!-- SOURCE: P451 -->
Conditional Logic

<!-- SOURCE: P452 -->
Show/hide or require fields based on previous responses.

<!-- SOURCE: P453 -->
Versions

<!-- SOURCE: P454 -->
Published forms shall support versioning so historical submissions remain tied to the correct form definition.

<!-- SOURCE: P455 -->
Publishing

<!-- SOURCE: P456 -->
Forms can be published/unpublished and associated with a job, event or internal process.

<!-- SOURCE: P457 -->
Exports

<!-- SOURCE: P458 -->
Authorized users can export submissions in structured formats.

<!-- SOURCE: P459 -->
P460: 8. Recruitment and ATS

<!-- SOURCE: P460 -->
8. Recruitment and ATS

<!-- SOURCE: P461 -->
FR-020 - Job Requisitions: HR/hiring managers shall create requisitions with title, department, location, employment type, headcount, budget range, requirements, approvers and hiring timeline. [Must]

<!-- SOURCE: P462 -->
FR-021 - Job Publishing: Approved requisitions shall be publishable to a public jobs page with job-specific application forms. [Must]

<!-- SOURCE: P463 -->
FR-022 - Candidate Database: The system shall provide candidate profiles with personal data, applications, documents, skills, notes, tags and activity history. [Must]

<!-- SOURCE: P464 -->
FR-023 - Pipeline: Recruiters shall move applications through configurable stages such as Applied, Screening, Shortlisted, Interview, Selected, Hold and Rejected. [Must]

<!-- SOURCE: P465 -->
FR-024 - Duplicate Detection: The system should detect likely duplicate candidate records using configurable identity/contact matching rules. [Must]

<!-- SOURCE: P466 -->
FR-025 - Search and Filter: Candidates shall be searchable by name, email, phone, skills, source, job, stage, interviewer, rating and date. [Must]

<!-- SOURCE: P467 -->
FR-026 - Rejection / Hold: Every hold/rejection should capture a reason and optional notes. Rejection reasons shall be reportable. [Must]

<!-- SOURCE: P468 -->
FR-027 - Talent Pool: Authorized recruiters should be able to retain eligible candidates in a searchable talent pool separate from active applications. [Must]

<!-- SOURCE: P469 -->
FR-028 - Candidate Communications: The system should record key communication events and support templated email notifications through configured integrations. [Must]

<!-- SOURCE: P470 -->
9. Interview Management

<!-- SOURCE: P471 -->
FR-040 - Interview Scheduling: Authorized users shall create interviews with candidate, application, round, panel/interviewer, date/time, mode, location/link and instructions. [Must]

<!-- SOURCE: P472 -->
FR-041 - Multi-round Interviews: A candidate may have multiple interview rounds with independent schedules and scorecards. [Must]

<!-- SOURCE: P473 -->
FR-042 - Interview Templates: HR shall define reusable evaluation templates with questions, competencies and scoring criteria. [Must]

<!-- SOURCE: P474 -->
FR-043 - Evaluation: Assigned interviewers shall submit structured scores, comments and recommendation. [Must]

<!-- SOURCE: P475 -->
FR-044 - Recommendation: Interviewers/hiring managers shall be able to recommend Hire, Hold or Reject, subject to approval policy. [Must]

<!-- SOURCE: P476 -->
FR-045 - Interview Status: Interviews shall support Scheduled, Checked-in, Completed, No-show, Rescheduled and Cancelled states. [Must]

<!-- SOURCE: P477 -->
FR-046 - Reminder: Configured users/candidates shall receive reminders before interviews. [Must]

<!-- SOURCE: P478 -->
FR-047 - Decision Summary: Authorized HR users shall see a consolidated candidate interview summary and stage history. [Must]

<!-- SOURCE: P479 -->
10. Candidate Attendance and Visitor Management

<!-- SOURCE: P480 -->
FR-060 - Candidate Check-in: Reception/HR shall record candidate check-in for a scheduled interview, walk-in visit or recruitment event. [Must]

<!-- SOURCE: P481 -->
FR-061 - Candidate Check-out: The system shall record candidate departure time where required. [Must]

<!-- SOURCE: P482 -->
FR-062 - Interview Attendance: Candidate attendance shall be linked to the interview/visit and shall not modify employee attendance records. [Must]

<!-- SOURCE: P483 -->
FR-063 - No-show: HR shall mark candidates as No-show and optionally record reason/notes. [Must]

<!-- SOURCE: P484 -->
FR-064 - Visitor History: The candidate profile shall show visit history, check-in/out and purpose. [Must]

<!-- SOURCE: P485 -->
FR-065 - QR / Reception Enhancement: The system should support QR-based self check-in and reception verification as a future enhancement. [Must]

<!-- SOURCE: P486 -->
11. Offer and Hiring

<!-- SOURCE: P487 -->
FR-080 - Selection: Authorized users shall mark an application Selected, On Hold or Rejected with decision notes. [Must]

<!-- SOURCE: P488 -->
FR-081 - Offer Draft: HR shall create an offer from candidate and approved requisition data using an offer template. [Must]

<!-- SOURCE: P489 -->
FR-082 - Offer Approval: The system shall support configurable approval steps before an offer can be sent. [Must]

<!-- SOURCE: P490 -->
FR-083 - Offer Delivery: Approved offers shall be downloadable and optionally delivered through configured communication channels. [Must]

<!-- SOURCE: P491 -->
FR-084 - Offer Status: Offer states shall include Draft, Pending Approval, Approved, Sent, Viewed, Accepted, Declined, Expired and Withdrawn as appropriate. [Must]

<!-- SOURCE: P492 -->
FR-085 - Candidate-to-Employee Conversion: Accepted candidates shall be convertible into employees with approved data mapped into the employee profile and a traceable source application reference. [Must]

<!-- SOURCE: P493 -->
12. Employee Management and Onboarding

<!-- SOURCE: P494 -->
FR-100 - Employee Master: HR shall maintain a unique employee record with employment, personal, contact, organizational and status data. [Must]

<!-- SOURCE: P495 -->
FR-101 - Employment History: The system shall maintain history for joining, confirmation, promotion, transfer, designation, department, manager and salary-related changes where applicable. [Must]

<!-- SOURCE: P496 -->
FR-102 - Onboarding Template: HR shall create reusable onboarding templates by department, role or employment type. [Must]

<!-- SOURCE: P497 -->
FR-103 - Onboarding Checklist: Each onboarding instance shall track tasks, assignee, due date, status, notes and completion timestamp. [Must]

<!-- SOURCE: P498 -->
FR-104 - Document Collection: Onboarding shall support employee document requests, upload, verification status and acknowledgement. [Must]

<!-- SOURCE: P499 -->
FR-105 - Probation: HR shall configure probation duration and receive reminders for approaching probation completion. [Must]

<!-- SOURCE: P500 -->
FR-106 - Self-service Profile: Employees shall be able to view and update only those fields explicitly permitted by policy. [Must]

<!-- SOURCE: P501 -->
13. Employee Attendance

<!-- SOURCE: P502 -->
FR-120 - Attendance Recording: The system shall support employee check-in/check-out through one or more configured attendance methods. [Must]

<!-- SOURCE: P503 -->
FR-121 - Attendance States: Supported states should include Present, Absent, Late, Half Day, WFH, On Duty, Overtime, Leave, Holiday and Weekly Off. [Must]

<!-- SOURCE: P504 -->
FR-122 - Shifts: HR shall define shifts, working hours, grace periods, weekly offs and rotational schedules. [Must]

<!-- SOURCE: P505 -->
FR-123 - Timesheets: The system shall calculate daily and period-based attendance totals and timesheets. [Must]

<!-- SOURCE: P506 -->
FR-124 - Corrections: Employees/managers may request attendance corrections. Approval rules shall be configurable. [Must]

<!-- SOURCE: P507 -->
FR-125 - Overtime: The system should record approved overtime hours separately from normal hours. [Must]

<!-- SOURCE: P508 -->
FR-126 - Attendance Calendar: HR and authorized managers shall have day/week/month attendance views with filters. [Must]

<!-- SOURCE: P509 -->
FR-127 - Integration: The architecture should support future biometric, device, API or import integrations. [Must]

<!-- SOURCE: P510 -->
14. Leave Management

<!-- SOURCE: P511 -->
FR-140 - Leave Types: HR shall configure leave types, eligibility, accrual, carry-forward and approval policy. [Must]

<!-- SOURCE: P512 -->
FR-141 - Leave Request: Employees shall request leave with dates, duration, type, reason and optional attachments. [Must]

<!-- SOURCE: P513 -->
FR-142 - Approvals: Leave approvals shall support manager, HR or multi-level workflows. [Must]

<!-- SOURCE: P514 -->
FR-143 - Balance: The system shall maintain leave balances and transaction history. [Must]

<!-- SOURCE: P515 -->
FR-144 - Calendar: Managers and HR shall see team/company leave calendars. [Must]

<!-- SOURCE: P516 -->
FR-145 - Attendance Linkage: Approved leave SHALL affect attendance processing according to policy. [Must]

<!-- SOURCE: P517 -->
15. Payroll and Expenses

<!-- SOURCE: P518 -->
Payroll is treated as an extensible module in the initial architecture, but the employee, attendance and compensation data models SHALL be designed so payroll can be added without restructuring core identity records.

<!-- SOURCE: P519 -->
FR-160 - Salary Structure: Support basic salary, allowances, deductions, incentives and other configurable components. [Should]

<!-- SOURCE: P520 -->
FR-161 - Payroll Cycle: Support monthly/periodic payroll runs with review and approval status. [Should]

<!-- SOURCE: P521 -->
FR-162 - Payslip: Authorized users shall generate/download payslips. [Should]

<!-- SOURCE: P522 -->
FR-163 - Expenses: Employees shall submit expenses with category, amount, date, receipt and notes. [Should]

<!-- SOURCE: P523 -->
FR-164 - Expense Approval: Expenses shall support configurable approval and payment statuses. [Should]

<!-- SOURCE: P524 -->
16. Performance and Learning

<!-- SOURCE: P525 -->
These modules should share employee identity, organizational hierarchy and manager relationships with the core HRMS.

<!-- SOURCE: P526 -->
FR-180 - Goals: Managers and employees should manage goals/KPIs/OKRs with due dates and status. [Should]

<!-- SOURCE: P527 -->
FR-181 - Performance Review: The system should support review cycles, self-review, manager review and configurable rating scales. [Should]

<!-- SOURCE: P528 -->
FR-182 - Feedback: Authorized workflows should support peer/360 feedback where enabled. [Should]

<!-- SOURCE: P529 -->
FR-183 - Training: HR should assign training, track attendance/completion and store certificates. [Should]

<!-- SOURCE: P530 -->
FR-184 - Skill Matrix: The system should track employee skills and proficiency for workforce planning. [Should]

<!-- SOURCE: P531 -->
17. Asset Management

<!-- SOURCE: P532 -->
FR-200 - Asset Inventory: Maintain assets with type, serial/identifier, purchase data, condition and status. [Should]

<!-- SOURCE: P533 -->
FR-201 - Assignment: Assign assets to employees and record issue/return dates. [Should]

<!-- SOURCE: P534 -->
FR-202 - Lifecycle: Track maintenance, repair, replacement and retirement where required. [Should]

<!-- SOURCE: P535 -->
FR-203 - Exit Return: Offboarding shall support asset return and clearance state. [Should]

<!-- SOURCE: P536 -->
18. Document Management

<!-- SOURCE: P537 -->
FR-220 - Repository: Store candidate and employee documents with type, owner, status and metadata. [Must]

<!-- SOURCE: P538 -->
FR-221 - Versioning: Document versions shall be tracked when replaced or updated. [Must]

<!-- SOURCE: P539 -->
FR-222 - Access Control: Documents shall inherit record-level and/or document-level authorization rules. [Must]

<!-- SOURCE: P540 -->
FR-223 - Download: Authorized users shall be able to preview/download documents and forms. [Must]

<!-- SOURCE: P541 -->
FR-224 - Expiry: The system should track expiry dates and generate alerts for expiring documents. [Must]

<!-- SOURCE: P542 -->
FR-225 - Retention: Policies shall support retention/archive/soft-delete behavior rather than uncontrolled permanent deletion. [Must]

<!-- SOURCE: P543 -->
19. HR Helpdesk and Requests

<!-- SOURCE: P544 -->
FR-240 - Request Creation: Employees shall create HR requests with category, description, priority and attachments. [Should]

<!-- SOURCE: P545 -->
FR-241 - Assignment: HR requests shall be assignable to HR staff with status and due date. [Should]

<!-- SOURCE: P546 -->
FR-242 - SLA: The system should support configurable service targets and overdue indicators. [Should]

<!-- SOURCE: P547 -->
FR-243 - History: All comments, status changes and assignments shall be retained in the request timeline. [Should]

<!-- SOURCE: P548 -->
20. Notifications and Workflow Automation

<!-- SOURCE: P549 -->
FR-260 - Notification Center: Users shall have an in-app notification center for actionable events. [Must]

<!-- SOURCE: P550 -->
FR-261 - Email Notifications: Configurable events shall support email notifications through a pluggable provider. [Must]

<!-- SOURCE: P551 -->
FR-262 - Reminders: The system shall generate reminders for interviews, pending approvals, probation dates, expiring documents and other scheduled events. [Must]

<!-- SOURCE: P552 -->
FR-263 - Task Center: HR users shall see tasks assigned to them with status, due date and source workflow. [Must]

<!-- SOURCE: P553 -->
FR-264 - Workflow Rules: The architecture should support event-driven rules such as candidate selected -> offer approval -> onboarding checklist. [Must]

<!-- SOURCE: P554 -->
21. Reports and Analytics

<!-- SOURCE: P555 -->
Area

<!-- SOURCE: P556 -->
Required Metrics

<!-- SOURCE: P557 -->
Recruitment

<!-- SOURCE: P558 -->
Applications, pipeline counts, source effectiveness, time to hire, interview pass rate, offer acceptance rate, open positions.

<!-- SOURCE: P559 -->
Candidate Attendance

<!-- SOURCE: P560 -->
Interview attendance, no-shows, check-in volumes, visit history.

<!-- SOURCE: P561 -->
Workforce

<!-- SOURCE: P562 -->
Headcount, department distribution, employment type, tenure, joiners/leavers.

<!-- SOURCE: P563 -->
Attendance

<!-- SOURCE: P564 -->
Present/absent/late/WFH/overtime trends, department comparisons, correction volumes.

<!-- SOURCE: P565 -->
Leave

<!-- SOURCE: P566 -->
Leave utilization, balances, leave trends, approval cycle time.

<!-- SOURCE: P567 -->
Onboarding

<!-- SOURCE: P568 -->
Task completion, overdue tasks, document completion, time to readiness.

<!-- SOURCE: P569 -->
Payroll / Expenses

<!-- SOURCE: P570 -->
Payroll totals, salary components, overtime, expense totals and approval cycle time when modules are enabled.

<!-- SOURCE: P571 -->
Performance

<!-- SOURCE: P572 -->
Review completion, goal status and rating trends when enabled.

<!-- SOURCE: P573 -->
Audit

<!-- SOURCE: P574 -->
Logins, permission changes, exports, downloads, sensitive field changes and administrative events.

<!-- SOURCE: P575 -->
P576: 22. Offboarding and Exit Management

<!-- SOURCE: P576 -->
22. Offboarding and Exit Management

<!-- SOURCE: P577 -->
FR-280 - Resignation: Employees/managers/HR shall initiate resignation according to configured policy. [Must]

<!-- SOURCE: P578 -->
FR-281 - Notice Period: HR shall track notice period and expected last working day. [Must]

<!-- SOURCE: P579 -->
FR-282 - Clearance: The system shall provide configurable clearance tasks for HR, IT, Finance, Assets and other departments. [Must]

<!-- SOURCE: P580 -->
FR-283 - Exit Interview: HR shall record structured exit feedback and optional ratings. [Must]

<!-- SOURCE: P581 -->
FR-284 - Access Revocation: Offboarding shall trigger tasks/events for system access deactivation where integrated. [Must]

<!-- SOURCE: P582 -->
FR-285 - Final Documents: Authorized HR users shall generate or attach experience/relieving and other exit documents. [Must]

<!-- SOURCE: P583 -->
FR-286 - Employee Status: The employee shall transition to Exited/Inactive without destroying the historical record required for compliance/reporting. [Must]

<!-- SOURCE: P584 -->
23. Compliance, Audit and Security

<!-- SOURCE: P585 -->
All protected API endpoints SHALL enforce authentication and authorization server-side.

<!-- SOURCE: P586 -->
Tenant/organization context SHALL be derived from the authenticated session or token and verified against the requested record.

<!-- SOURCE: P587 -->
Sensitive data SHALL be encrypted in transit using HTTPS/TLS and protected at rest using platform-appropriate encryption controls.

<!-- SOURCE: P588 -->
Passwords SHALL be stored using strong, salted password hashing; raw passwords SHALL never be persisted or logged.

<!-- SOURCE: P589 -->
The application SHALL validate uploaded file type/size and should validate file signatures where appropriate to prevent malicious uploads.

<!-- SOURCE: P590 -->
Audit logs SHALL record actor, action, resource, timestamp, organization, request correlation ID where available, and outcome.

<!-- SOURCE: P591 -->
Administrative and sensitive actions should require elevated permission and may require re-authentication or MFA depending on policy.

<!-- SOURCE: P592 -->
Bulk exports SHALL be permission-controlled and auditable.

<!-- SOURCE: P593 -->
Logs SHALL avoid storing unnecessary personal or secret data.

<!-- SOURCE: P594 -->
Data retention and deletion behavior SHALL be configurable and aligned with the organization’s legal/policy requirements.

<!-- SOURCE: P595 -->
The system SHALL support configurable session timeout, account lock/rate limiting and suspicious login monitoring.

<!-- SOURCE: P596 -->
Security controls SHALL be applied consistently across UI, API, background jobs, exports and integrations.

<!-- SOURCE: P597 -->
24. Multi-Tenant / Organization Architecture

<!-- SOURCE: P598 -->
The recommended architecture is organization-scoped. A single platform instance may host multiple organizations while guaranteeing logical isolation of data. A future enterprise tier may support subsidiaries, business units, locations and departments beneath an organization.

<!-- SOURCE: P599 -->
Scope Level

<!-- SOURCE: P600 -->
Examples

<!-- SOURCE: P601 -->
Isolation / Control

<!-- SOURCE: P602 -->
Platform

<!-- SOURCE: P603 -->
System configuration, feature flags

<!-- SOURCE: P604 -->
Super-admin only

<!-- SOURCE: P605 -->
Organization

<!-- SOURCE: P606 -->
Employees, candidates, jobs, policies, attendance

<!-- SOURCE: P607 -->
Tenant-scoped

<!-- SOURCE: P608 -->
Business Unit / Location

<!-- SOURCE: P609 -->
Office, region, subsidiary

<!-- SOURCE: P610 -->
Organization child scope

<!-- SOURCE: P611 -->
Department

<!-- SOURCE: P612 -->
Engineering, HR, Sales

<!-- SOURCE: P613 -->
Org/location child scope

<!-- SOURCE: P614 -->
Employee / Candidate

<!-- SOURCE: P615 -->
Individual record

<!-- SOURCE: P616 -->
Record-level permission

<!-- SOURCE: P617 -->
P618: 25. Data Requirements

<!-- SOURCE: P618 -->
25. Data Requirements

<!-- SOURCE: P619 -->
25.1 Core Entities

<!-- SOURCE: P620 -->
Entity

<!-- SOURCE: P621 -->
Purpose

<!-- SOURCE: P622 -->
Organization

<!-- SOURCE: P623 -->
Tenant/company identity, plan, settings, policies

<!-- SOURCE: P624 -->
User

<!-- SOURCE: P625 -->
Authentication identity, role assignment, status

<!-- SOURCE: P626 -->
Role / Permission

<!-- SOURCE: P627 -->
RBAC definitions and assignments

<!-- SOURCE: P628 -->
Department

<!-- SOURCE: P629 -->
Organizational grouping

<!-- SOURCE: P630 -->
Location

<!-- SOURCE: P631 -->
Office/site/remote location

<!-- SOURCE: P632 -->
Job Requisition

<!-- SOURCE: P633 -->
Internal hiring request and approvals

<!-- SOURCE: P634 -->
Job Posting

<!-- SOURCE: P635 -->
Public-facing job listing

<!-- SOURCE: P636 -->
Form Template

<!-- SOURCE: P637 -->
Form definition/version

<!-- SOURCE: P638 -->
Form Submission

<!-- SOURCE: P639 -->
Submitted application/walk-in/internal form

<!-- SOURCE: P640 -->
Candidate

<!-- SOURCE: P641 -->
Person being considered for employment

<!-- SOURCE: P642 -->
Application

<!-- SOURCE: P643 -->
Candidate-to-job relationship and lifecycle state

<!-- SOURCE: P644 -->
Interview

<!-- SOURCE: P645 -->
Scheduled interview event and state

<!-- SOURCE: P646 -->
Interview Evaluation

<!-- SOURCE: P647 -->
Structured interviewer scorecard

<!-- SOURCE: P648 -->
Candidate Visit / Attendance

<!-- SOURCE: P649 -->
Candidate check-in/out record

<!-- SOURCE: P650 -->
Offer

<!-- SOURCE: P651 -->
Offer details, approvals and status

<!-- SOURCE: P652 -->
Employee

<!-- SOURCE: P653 -->
Active/inactive workforce identity

<!-- SOURCE: P654 -->
Employment History

<!-- SOURCE: P655 -->
Status, manager, department, designation and employment events

<!-- SOURCE: P656 -->
Onboarding Instance / Task

<!-- SOURCE: P657 -->
Joining workflow and task tracking

<!-- SOURCE: P658 -->
Attendance Record

<!-- SOURCE: P659 -->
Employee daily attendance / time event

<!-- SOURCE: P660 -->
Shift

<!-- SOURCE: P661 -->
Working schedule definition

<!-- SOURCE: P662 -->
Leave Type / Balance / Request

<!-- SOURCE: P663 -->
Leave rules and transactions

<!-- SOURCE: P664 -->
Document / Document Version

<!-- SOURCE: P665 -->
Controlled HR/candidate documents

<!-- SOURCE: P666 -->
Notification

<!-- SOURCE: P667 -->
User-facing message/event

<!-- SOURCE: P668 -->
HR Request / Ticket

<!-- SOURCE: P669 -->
Employee HR service request

<!-- SOURCE: P670 -->
Expense

<!-- SOURCE: P671 -->
Employee expense/reimbursement

<!-- SOURCE: P672 -->
Payroll Run / Payslip

<!-- SOURCE: P673 -->
Payroll records where enabled

<!-- SOURCE: P674 -->
Performance Cycle / Review

<!-- SOURCE: P675 -->
Performance management data

<!-- SOURCE: P676 -->
Training / Certificate

<!-- SOURCE: P677 -->
Learning records

<!-- SOURCE: P678 -->
Asset / Assignment

<!-- SOURCE: P679 -->
Company asset inventory and ownership

<!-- SOURCE: P680 -->
Exit Case

<!-- SOURCE: P681 -->
Offboarding and clearance

<!-- SOURCE: P682 -->
Audit Event

<!-- SOURCE: P683 -->
Security and business audit record

<!-- SOURCE: P684 -->
P685: 25.2 Data Quality Rules

<!-- SOURCE: P685 -->
25.2 Data Quality Rules

<!-- SOURCE: P686 -->
Unique identifiers SHALL be generated for candidates, applications, employees, forms, submissions, interviews, offers and documents.

<!-- SOURCE: P687 -->
Email/phone uniqueness shall be configurable by organization and use case rather than hardcoded globally.

<!-- SOURCE: P688 -->
Dates/times SHALL be stored consistently and rendered according to user/organization timezone policy.

<!-- SOURCE: P689 -->
Historical records SHALL not be silently overwritten where business traceability matters; use version/history records where appropriate.

<!-- SOURCE: P690 -->
Soft-delete/archive SHOULD be preferred for HR and compliance records that must remain historically meaningful.

<!-- SOURCE: P691 -->
26. API and Integration Requirements

<!-- SOURCE: P692 -->
The backend should expose versioned, documented APIs. All protected endpoints must apply authentication, authorization, validation, organization scoping, consistent errors, and audit logging where applicable.

<!-- SOURCE: P693 -->
API Group

<!-- SOURCE: P694 -->
Representative Endpoints / Capabilities

<!-- SOURCE: P695 -->
Auth

<!-- SOURCE: P696 -->
/auth/login, /auth/logout, /auth/session, /auth/password-reset, /auth/mfa

<!-- SOURCE: P697 -->
Forms

<!-- SOURCE: P698 -->
/forms, /forms/{id}, /forms/{id}/publish, /forms/{id}/submissions, /forms/{id}/export

<!-- SOURCE: P699 -->
Recruitment

<!-- SOURCE: P700 -->
/requisitions, /jobs, /candidates, /applications, /pipeline

<!-- SOURCE: P701 -->
Interviews

<!-- SOURCE: P702 -->
/interviews, /interviews/{id}/evaluations, /interviews/{id}/attendance

<!-- SOURCE: P703 -->
Hiring

<!-- SOURCE: P704 -->
/offers, /offers/{id}/approve, /offers/{id}/send, /applications/{id}/convert

<!-- SOURCE: P705 -->
Employees

<!-- SOURCE: P706 -->
/employees, /employees/{id}, /employees/{id}/history

<!-- SOURCE: P707 -->
Onboarding

<!-- SOURCE: P708 -->
/onboarding, /onboarding/{id}/tasks

<!-- SOURCE: P709 -->
Attendance

<!-- SOURCE: P710 -->
/attendance, /attendance/check-in, /attendance/check-out, /attendance/corrections

<!-- SOURCE: P711 -->
Leave

<!-- SOURCE: P712 -->
/leave/types, /leave/balances, /leave/requests, /leave/approvals

<!-- SOURCE: P713 -->
Documents

<!-- SOURCE: P714 -->
/documents, /documents/{id}/download, /documents/{id}/versions

<!-- SOURCE: P715 -->
Reports

<!-- SOURCE: P716 -->
/reports/*, /analytics/*

<!-- SOURCE: P717 -->
Audit

<!-- SOURCE: P718 -->
/audit-events

<!-- SOURCE: P719 -->
P720: 26.1 External Integrations

<!-- SOURCE: P720 -->
26.1 External Integrations

<!-- SOURCE: P721 -->
Email provider / SMTP service

<!-- SOURCE: P722 -->
Google Calendar / Microsoft 365 calendar

<!-- SOURCE: P723 -->
Video meeting provider (optional)

<!-- SOURCE: P724 -->
Biometric attendance device / attendance provider

<!-- SOURCE: P725 -->
Cloud file storage

<!-- SOURCE: P726 -->
Accounting/payroll systems

<!-- SOURCE: P727 -->
SSO provider (OAuth/OIDC/SAML as required)

<!-- SOURCE: P728 -->
SMS/WhatsApp provider

<!-- SOURCE: P729 -->
Digital signature provider

<!-- SOURCE: P730 -->
Future AI service for parsing/summarization under explicit privacy controls

<!-- SOURCE: P731 -->
26.2 Integration Principles

<!-- SOURCE: P732 -->
Integrations SHALL use credentials stored in secure secret storage, not source code.

<!-- SOURCE: P733 -->
External API calls SHALL have timeouts, retries with bounded backoff where safe, and observable failures.

<!-- SOURCE: P734 -->
Webhook endpoints SHALL validate authenticity/signatures when the provider supports it.

<!-- SOURCE: P735 -->
Background jobs SHALL be durable and idempotent to prevent duplicate actions.

<!-- SOURCE: P736 -->
Integration failures SHALL not corrupt core HR records; failures should be retriable and visible to administrators.

<!-- SOURCE: P737 -->
27. Non-Functional Requirements

<!-- SOURCE: P738 -->
Category

<!-- SOURCE: P739 -->
Requirement

<!-- SOURCE: P740 -->
Availability

<!-- SOURCE: P741 -->
Production target should be defined by deployment tier; design for graceful degradation and recoverability.

<!-- SOURCE: P742 -->
Performance

<!-- SOURCE: P743 -->
Typical authenticated pages and API calls should return within an acceptable interactive target under expected load; exact SLA to be set during capacity planning.

<!-- SOURCE: P744 -->
Scalability

<!-- SOURCE: P745 -->
Architecture should support growth in organizations, employees, candidates, documents and audit events without redesigning core entities.

<!-- SOURCE: P746 -->
Reliability

<!-- SOURCE: P747 -->
Critical workflows such as offer approval, onboarding completion and leave approval must be transactionally consistent.

<!-- SOURCE: P748 -->
Security

<!-- SOURCE: P749 -->
Use TLS, secure cookies/tokens, RBAC, rate limiting, input validation, secure file handling, audit logging and secret management.

<!-- SOURCE: P750 -->
Accessibility

<!-- SOURCE: P751 -->
Target WCAG 2.1 AA principles for core workflows including keyboard navigation, contrast, labels and error feedback.

<!-- SOURCE: P752 -->
Responsive UX

<!-- SOURCE: P753 -->
Core workflows must be usable on desktop, tablet and mobile breakpoints.

<!-- SOURCE: P754 -->
Observability

<!-- SOURCE: P755 -->
Centralized logs, health/readiness endpoints, metrics and trace/correlation IDs for backend operations.

<!-- SOURCE: P756 -->
Maintainability

<!-- SOURCE: P757 -->
Modular domain architecture, typed interfaces, automated tests, migration discipline and documented APIs.

<!-- SOURCE: P758 -->
Backup / Recovery

<!-- SOURCE: P759 -->
Define automated backups, retention and recovery testing appropriate to the deployment environment.

<!-- SOURCE: P760 -->
Localization

<!-- SOURCE: P761 -->
Dates, times, number formats, timezone and future multi-language support should be modeled without hardcoding presentation formats.

<!-- SOURCE: P762 -->
Browser Support

<!-- SOURCE: P763 -->
Support current major Chromium, Firefox and Safari releases appropriate to the deployment policy.

<!-- SOURCE: P764 -->
P765: 28. UX / UI Requirements

<!-- SOURCE: P765 -->
28. UX / UI Requirements

<!-- SOURCE: P766 -->
The interface SHALL use a consistent enterprise design system with clear hierarchy, accessible contrast, responsive layouts and reusable components.

<!-- SOURCE: P767 -->
Dashboard widgets shall support drill-down to the underlying records.

<!-- SOURCE: P768 -->
Data-heavy pages such as candidates, employees and attendance shall support search, filters, sorting, pagination and saved views where useful.

<!-- SOURCE: P769 -->
Critical workflows shall provide clear status chips, approval indicators, validation messages and confirmation feedback.

<!-- SOURCE: P770 -->
Tables shall avoid horizontal overflow on smaller screens by using responsive patterns such as stacked rows, responsive columns or dedicated mobile detail views.

<!-- SOURCE: P771 -->
Forms shall preserve entered data on recoverable errors where practical and display field-level validation.

<!-- SOURCE: P772 -->
Sensitive fields shall be visually identifiable and masked where appropriate.

<!-- SOURCE: P773 -->
Download/export actions shall identify format and access level clearly.

<!-- SOURCE: P774 -->
Bulk actions shall require confirmation when irreversible or high-impact.

<!-- SOURCE: P775 -->
Empty states shall guide users toward the next action rather than showing blank screens.

<!-- SOURCE: P776 -->
28.1 Recommended Navigation

<!-- SOURCE: P777 -->
Primary Navigation

<!-- SOURCE: P778 -->
Key Submodules

<!-- SOURCE: P779 -->
Dashboard

<!-- SOURCE: P780 -->
Overview, alerts, tasks, KPIs

<!-- SOURCE: P781 -->
Recruitment

<!-- SOURCE: P782 -->
Requisitions, Jobs, Candidates, Applications, Interviews, Offers, Talent Pool

<!-- SOURCE: P783 -->
Employees

<!-- SOURCE: P784 -->
Directory, Profiles, Onboarding, Documents, Assets, History

<!-- SOURCE: P785 -->
Attendance

<!-- SOURCE: P786 -->
Daily, Timesheets, Shifts, Overtime, Corrections

<!-- SOURCE: P787 -->
Leave

<!-- SOURCE: P788 -->
Requests, Balances, Policies, Calendar

<!-- SOURCE: P789 -->
Payroll

<!-- SOURCE: P790 -->
Salary, Runs, Payslips, Expenses - when enabled

<!-- SOURCE: P791 -->
Performance

<!-- SOURCE: P792 -->
Goals, Reviews, Feedback

<!-- SOURCE: P793 -->
Learning

<!-- SOURCE: P794 -->
Courses, Training, Certificates

<!-- SOURCE: P795 -->
Forms

<!-- SOURCE: P796 -->
Builder, Published Forms, Submissions, Downloads

<!-- SOURCE: P797 -->
Helpdesk

<!-- SOURCE: P798 -->
Requests, Tickets

<!-- SOURCE: P799 -->
Reports & Analytics

<!-- SOURCE: P800 -->
Recruitment, Workforce, Attendance, Leave, HR KPIs

<!-- SOURCE: P801 -->
Automation

<!-- SOURCE: P802 -->
Rules, Jobs, Workflow History

<!-- SOURCE: P803 -->
Compliance

<!-- SOURCE: P804 -->
Audit Logs, Access Reports, Policies

<!-- SOURCE: P805 -->
Settings

<!-- SOURCE: P806 -->
Organization, Users, Roles, Master Data, Integrations

<!-- SOURCE: P807 -->
P808: 29. Reporting KPIs

<!-- SOURCE: P808 -->
29. Reporting KPIs

<!-- SOURCE: P809 -->
Time to hire: requisition approval to accepted offer / configurable definition.

<!-- SOURCE: P810 -->
Time to fill: requisition opening to accepted offer.

<!-- SOURCE: P811 -->
Candidate conversion rate by stage.

<!-- SOURCE: P812 -->
Interview no-show rate.

<!-- SOURCE: P813 -->
Offer acceptance rate.

<!-- SOURCE: P814 -->
New joiner onboarding completion rate.

<!-- SOURCE: P815 -->
Average onboarding completion time.

<!-- SOURCE: P816 -->
Attendance rate, absenteeism and late-arrival rate.

<!-- SOURCE: P817 -->
Leave utilization and approval turnaround.

<!-- SOURCE: P818 -->
Headcount by department/location/employment type.

<!-- SOURCE: P819 -->
Employee turnover / attrition rate.

<!-- SOURCE: P820 -->
Probation completion / confirmation rate.

<!-- SOURCE: P821 -->
HR request resolution time.

<!-- SOURCE: P822 -->
Document expiry risk count.

<!-- SOURCE: P823 -->
Recruitment source effectiveness.

<!-- SOURCE: P824 -->
30. Acceptance Criteria

<!-- SOURCE: P825 -->
ID

<!-- SOURCE: P826 -->
Area

<!-- SOURCE: P827 -->
Acceptance Condition

<!-- SOURCE: P828 -->
AC-01

<!-- SOURCE: P829 -->
Online Hiring Form

<!-- SOURCE: P830 -->
A public job application can be submitted successfully; submission creates candidate + application; authorized HR can view and download the completed form.

<!-- SOURCE: P831 -->
AC-02

<!-- SOURCE: P832 -->
Walk-in Form

<!-- SOURCE: P833 -->
HR/reception can register a walk-in candidate, record visit details, check-in/out, and download/print the submitted form.

<!-- SOURCE: P834 -->
AC-03

<!-- SOURCE: P835 -->
Hiring Workflow

<!-- SOURCE: P836 -->
HR can view candidate data, move the application through stages, schedule interviews and make Hire/Hold/Reject decisions with traceability.

<!-- SOURCE: P837 -->
AC-04

<!-- SOURCE: P838 -->
Interview Evaluation

<!-- SOURCE: P839 -->
Assigned interviewers can complete evaluation scorecards and recommendations; HR can see consolidated interview history.

<!-- SOURCE: P840 -->
AC-05

<!-- SOURCE: P841 -->
Candidate Attendance

<!-- SOURCE: P842 -->
Candidate interview/visit attendance is tracked independently from employee attendance.

<!-- SOURCE: P843 -->
AC-06

<!-- SOURCE: P844 -->
Conversion

<!-- SOURCE: P845 -->
An accepted candidate can be converted into an employee without duplicate manual data entry for mapped fields; source linkage is preserved.

<!-- SOURCE: P846 -->
AC-07

<!-- SOURCE: P847 -->
Onboarding

<!-- SOURCE: P848 -->
HR can assign onboarding tasks, track completion and outstanding documents.

<!-- SOURCE: P849 -->
AC-08

<!-- SOURCE: P850 -->
Employee Attendance

<!-- SOURCE: P851 -->
Employees and authorized managers can view attendance, request corrections and apply approved leave without corrupting historical records.

<!-- SOURCE: P852 -->
AC-09

<!-- SOURCE: P853 -->
Permissions

<!-- SOURCE: P854 -->
A user without permission cannot access protected candidate/employee/salary/document data through the UI or API.

<!-- SOURCE: P855 -->
AC-10

<!-- SOURCE: P856 -->
Audit

<!-- SOURCE: P857 -->
Sensitive administrative, approval, export and download events are recorded with actor/time/resource.

<!-- SOURCE: P858 -->
AC-11

<!-- SOURCE: P859 -->
Responsive UI

<!-- SOURCE: P860 -->
Core candidate and employee workflows are usable on supported desktop, tablet and mobile breakpoints.

<!-- SOURCE: P861 -->
AC-12

<!-- SOURCE: P862 -->
Reporting

<!-- SOURCE: P863 -->
Authorized HR users can obtain recruitment and attendance reports that match underlying source records.

<!-- SOURCE: P864 -->
P865: 31. Implementation Roadmap

<!-- SOURCE: P865 -->
31. Implementation Roadmap

<!-- SOURCE: P866 -->
Phase

<!-- SOURCE: P867 -->
Scope

<!-- SOURCE: P868 -->
Phase 0 - Foundation

<!-- SOURCE: P869 -->
Architecture, auth, organization/tenant model, RBAC, design system, database conventions, audit framework, file storage and observability.

<!-- SOURCE: P870 -->
Phase 1 - Recruitment Core

<!-- SOURCE: P871 -->
Jobs, online hiring form, walk-in form, candidate database, ATS pipeline, search/filter, candidate attendance.

<!-- SOURCE: P872 -->
Phase 2 - Interviews & Hiring

<!-- SOURCE: P873 -->
Interview scheduling, scorecards, feedback, Hire/Hold/Reject, offers, approvals, candidate conversion.

<!-- SOURCE: P874 -->
Phase 3 - Employee Core

<!-- SOURCE: P875 -->
Employee directory/profile, onboarding, documents, employment history, notifications.

<!-- SOURCE: P876 -->
Phase 4 - Attendance & Leave

<!-- SOURCE: P877 -->
Shifts, attendance, timesheets, correction requests, leave policies, approvals, balances.

<!-- SOURCE: P878 -->
Phase 5 - HR Operations

<!-- SOURCE: P879 -->
Helpdesk, assets, expenses, advanced reports, document expiry, workflow automation.

<!-- SOURCE: P880 -->
Phase 6 - Workforce Management

<!-- SOURCE: P881 -->
Performance, learning, advanced analytics, payroll integration/support, external integrations.

<!-- SOURCE: P882 -->
Phase 7 - Enterprise / AI

<!-- SOURCE: P883 -->
SSO, multi-organization enhancements, mobile-first employee experience, AI assistant, resume intelligence, predictive analytics.

<!-- SOURCE: P884 -->
P885: 32. Assumptions and Open Decisions

<!-- SOURCE: P885 -->
32. Assumptions and Open Decisions

<!-- SOURCE: P886 -->
The portal is web-first and responsive; native mobile apps are not required for the core release.

<!-- SOURCE: P887 -->
Payroll/tax rules are organization/country dependent and should be finalized before enabling payroll processing in production.

<!-- SOURCE: P888 -->
The organization will define its approval policies for requisitions, interviews, offers, leave, attendance corrections and expenses.

<!-- SOURCE: P889 -->
Document retention, data residency, privacy and legal compliance requirements must be finalized for the deployment geography and organization type.

<!-- SOURCE: P890 -->
Biometric devices, calendar services, email providers and other external systems may require separate integration projects.

<!-- SOURCE: P891 -->
AI features are optional and shall not make autonomous high-impact employment decisions without appropriate human review and policy controls.

<!-- SOURCE: P892 -->
Exact capacity targets (number of employees/candidates, concurrent users, API throughput) should be defined before production sizing.

<!-- SOURCE: P893 -->
Exact UI visual language, branding, color tokens and component library are to be finalized in the UX design system.

<!-- SOURCE: P894 -->
Exact list of statutory forms, employment contracts and legal documents is organization-specific and should be configurable rather than hardcoded.

<!-- SOURCE: P895 -->
32.1 Recommended Immediate Product Decisions

<!-- SOURCE: P896 -->
Confirm the first release countries and statutory requirements.

<!-- SOURCE: P897 -->
Confirm whether the portal is single-company initially or must support multiple organizations from day one.

<!-- SOURCE: P898 -->
Confirm the attendance source for V1: manual/web, biometric integration, GPS, or a combination.

<!-- SOURCE: P899 -->
Confirm the notification stack: email only or email + SMS/WhatsApp + push.

<!-- SOURCE: P900 -->
Confirm the deployment target and database/storage strategy.

<!-- SOURCE: P901 -->
Define the initial permission matrix for HR, recruiter, interviewer, manager and employee roles.

<!-- SOURCE: P902 -->
Appendix A - Suggested Candidate Profile View

<!-- SOURCE: P903 -->
Section

<!-- SOURCE: P904 -->
Typical Information

<!-- SOURCE: P905 -->
Identity

<!-- SOURCE: P906 -->
Name, candidate ID, contact, location

<!-- SOURCE: P907 -->
Application

<!-- SOURCE: P908 -->
Job, source, application date, current stage

<!-- SOURCE: P909 -->
Resume / Documents

<!-- SOURCE: P910 -->
Resume, certificates, supporting files

<!-- SOURCE: P911 -->
Interview

<!-- SOURCE: P912 -->
Rounds, schedule, attendance, evaluators, scores, feedback

<!-- SOURCE: P913 -->
Decision

<!-- SOURCE: P914 -->
Hire / Hold / Reject, reasons, approvals

<!-- SOURCE: P915 -->
Offer

<!-- SOURCE: P916 -->
Offer status, compensation summary, dates

<!-- SOURCE: P917 -->
Visit History

<!-- SOURCE: P918 -->
Walk-in/interview visits, check-in/out

<!-- SOURCE: P919 -->
Activity

<!-- SOURCE: P920 -->
Notes, status changes, communications and audit trail

<!-- SOURCE: P921 -->
P922: Appendix B - Suggested Employee Profile View

<!-- SOURCE: P922 -->
Appendix B - Suggested Employee Profile View

<!-- SOURCE: P923 -->
Section

<!-- SOURCE: P924 -->
Typical Information

<!-- SOURCE: P925 -->
Overview

<!-- SOURCE: P926 -->
Employee ID, name, status, designation, department, manager

<!-- SOURCE: P927 -->
Personal

<!-- SOURCE: P928 -->
Contact, address, emergency contact, dependents

<!-- SOURCE: P929 -->
Employment

<!-- SOURCE: P930 -->
Joining date, probation, confirmation, location, type

<!-- SOURCE: P931 -->
Attendance

<!-- SOURCE: P932 -->
Current period summary, corrections, shifts

<!-- SOURCE: P933 -->
Leave

<!-- SOURCE: P934 -->
Balances, requests, history

<!-- SOURCE: P935 -->
Documents

<!-- SOURCE: P936 -->
Employment and identity documents

<!-- SOURCE: P937 -->
Compensation

<!-- SOURCE: P938 -->
Salary/compensation details subject to permission

<!-- SOURCE: P939 -->
Performance

<!-- SOURCE: P940 -->
Goals, reviews, feedback, PIP where enabled

<!-- SOURCE: P941 -->
Assets

<!-- SOURCE: P942 -->
Assigned company assets

<!-- SOURCE: P943 -->
Requests

<!-- SOURCE: P944 -->
HR helpdesk tickets and service requests

<!-- SOURCE: P945 -->
Lifecycle

<!-- SOURCE: P946 -->
Onboarding, transfers, promotions, exit history

<!-- SOURCE: P947 -->
P948: Appendix C - Minimum V1 Database Relationships

<!-- SOURCE: P948 -->
Appendix C - Minimum V1 Database Relationships

<!-- SOURCE: P949 -->
Organization 1:N Users, Departments, Locations, Jobs, Candidates, Employees, Policies and Audit Events.

<!-- SOURCE: P950 -->
Job Requisition 1:N Applications; Job Requisition 1:1 or 1:N Job Postings depending on publishing model.

<!-- SOURCE: P951 -->
Candidate 1:N Applications, Interviews, Visits, Documents, Offers and Activity Events.

<!-- SOURCE: P952 -->
Application 1:N Interviews; Application 0..1:N Offers depending on policy.

<!-- SOURCE: P953 -->
Application 0..1 -> Employee conversion relationship preserves source_application_id / source_candidate_id.

<!-- SOURCE: P954 -->
Employee 1:N Attendance, Leave Requests, Documents, Assets, Requests, Performance Reviews and Employment History.

<!-- SOURCE: P955 -->
Interview 1:N Interview Evaluations; Interview 0..1:1 Candidate Attendance event for the visit/check-in model, with multiple visits supported when needed.

<!-- SOURCE: P956 -->
All major records include organization_id plus created_by, created_at, updated_by, updated_at as appropriate.

<!-- SOURCE: P957 -->
P958: End of Software Requirements Specification

<!-- SOURCE: P958 -->
End of Software Requirements Specification

<!-- SOURCE: P959 -->
HR Management & Employee Lifecycle Portal - Version 1.1
