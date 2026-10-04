# Requirements Document

## Introduction

CareLink currently exposes a public landing page that offers three role options (Citizen, Barangay Health Worker, Doctor) and links each directly to a role-pinned login portal. This feature reworks that unauthenticated entry flow into a staged, guided sequence: a dedicated landing page, a separate login page, a "new to CareLink vs. returning" step, and then an explicit role-selection step (patient, doctor, BHW). The flow must route each role-and-status combination to the correct destination (citizen self-registration, doctor application, returning-user password sign-in, or a seeded-only message for new BHW users).

Because the current steering documents (`product.md` and `structure.md`) mandate a single `/login` page with no role selector and server-side role routing after authentication, this feature also explicitly includes updating those steering documents to describe the new staged flow and the revised public route map. The authoritative intent is the new flow; the steering docs are brought in line with it, not the other way around.

The admin role is intentionally excluded from every public choice. The admin portal remains reachable by direct URL only. All work must honor the mandated tech stack: Vite + React 18 + TypeScript (strict), React Router v6 lazy-loaded route groups, Tailwind + shadcn/ui, React Hook Form + Zod where forms are involved, Supabase Auth, and react-i18next for all user-facing text (English and Filipino).

## Glossary

- **Auth_Flow**: The complete unauthenticated entry experience of CareLink, spanning the landing page, the login page, the new-or-returning step, and the role-selection step.
- **Landing_Page**: The public introductory screen at route `/`, shown to an unauthenticated visitor, that introduces CareLink and provides a single primary action leading to the Login_Page.
- **Login_Page**: The public screen, at a route distinct from the Landing_Page, that hosts the staged sign-in experience (new-or-returning step followed by role-selection step and the appropriate outcome).
- **Status_Step**: The step within the Login_Page where the visitor declares whether they are new to CareLink or a returning (existing) user.
- **Role_Step**: The step within the Login_Page where the visitor selects their role from Citizen, Doctor, or BHW.
- **Visitor_Status**: The declared value from the Status_Step, exactly one of `new` or `returning`.
- **Selected_Role**: The role chosen in the Role_Step, exactly one of `citizen`, `physician`, or `barangay_staff`.
- **Citizen**: A patient user; role name `citizen` in code.
- **Physician**: A doctor user; role name `physician` in code.
- **Barangay_Staff**: A Barangay Health Worker (BHW); role name `barangay_staff` in code. These accounts are seeded by an administrator and cannot self-register.
- **Admin**: An administrator user; role name `admin` in code. Not offered in any public Auth_Flow choice.
- **Auth_Provider**: The existing authentication context (`AuthProvider`) exposing sign-in, portal sign-in, sign-up, sign-out, and role-home resolution.
- **Role_Home**: The default authenticated destination route for a given role, resolved by the Auth_Provider.
- **I18n_System**: The react-i18next translation layer backed by `en.json` and `fil.json`.
- **Steering_Docs**: The CareLink steering documents `.kiro/steering/product.md` and `.kiro/steering/structure.md`.

## Requirements

### Requirement 1: Landing page distinct from login

**User Story:** As an unauthenticated visitor, I want a landing page that introduces CareLink separately from the sign-in screen, so that I understand the product before I begin signing in.

#### Acceptance Criteria

1. WHEN an unauthenticated visitor navigates to route `/`, THE Landing_Page SHALL be displayed.
2. THE Landing_Page SHALL present exactly one navigational control that navigates to the Login_Page, and SHALL present no other control that navigates to any sign-in, registration, or role-specific login route.
3. THE Login_Page SHALL be served at a route distinct from the route of the Landing_Page.
4. WHERE a visitor has an active authenticated session AND that visitor's profile has resolved to exactly one defined role, WHEN that visitor navigates to the Landing_Page, THE Auth_Flow SHALL redirect that visitor to the Role_Home for that role within 1 second of profile resolution.
5. THE Landing_Page SHALL render all user-facing text through keys resolved by the I18n_System.
6. THE Landing_Page SHALL NOT present any role-selection control.
7. WHILE a visitor has an active authenticated session but the profile has not yet resolved, THE Landing_Page SHALL remain displayed and SHALL NOT redirect.
8. IF a visitor has an active authenticated session but profile resolution yields no defined role, THEN THE Landing_Page SHALL remain displayed and SHALL NOT redirect.

### Requirement 2: Login page new-or-returning step

**User Story:** As a visitor arriving at the login page, I want to first state whether I am new to CareLink or a returning user, so that the flow guides me to registration or sign-in appropriately.

#### Acceptance Criteria

1. WHEN the Login_Page is first displayed, THE Status_Step SHALL be presented before the Role_Step and SHALL present no Visitor_Status value as pre-selected.
2. THE Status_Step SHALL present exactly two mutually exclusive choices, one representing the Visitor_Status value `new` and one representing the Visitor_Status value `returning`.
3. WHEN a visitor selects a Visitor_Status value, THE Login_Page SHALL advance to the Role_Step within 1 second and SHALL retain the selected Visitor_Status value for use by the Role_Step.
4. THE Status_Step SHALL render all user-facing text through keys resolved by the I18n_System.
5. WHILE the Status_Step is displayed, THE Login_Page SHALL provide a control that returns the visitor to the Landing_Page and SHALL discard any in-progress Visitor_Status selection.

### Requirement 3: Role-selection step

**User Story:** As a visitor who has chosen new or returning, I want to select my role as patient, doctor, or BHW, so that the flow applies the rules for my role.

#### Acceptance Criteria

1. WHEN the Role_Step is displayed, THE Role_Step SHALL present exactly three role choices corresponding to Selected_Role values `citizen`, `physician`, and `barangay_staff`.
2. THE Role_Step SHALL NOT present the `admin` role as a choice.
3. WHEN a visitor selects a Selected_Role value AND a Visitor_Status value has been set, THE Login_Page SHALL present the outcome determined by the combination of that Visitor_Status and that Selected_Role.
4. WHILE the Role_Step is displayed, THE Login_Page SHALL provide a control that returns the visitor to the Status_Step and SHALL preserve the previously selected Visitor_Status.
5. THE Role_Step SHALL render all user-facing text through keys resolved by the I18n_System.
6. IF a visitor reaches the Role_Step with no Visitor_Status set, THEN THE Login_Page SHALL return the visitor to the Status_Step.

### Requirement 4: Returning-user routing per role

**User Story:** As a returning user, I want selecting my role to take me to the correct sign-in form, so that I can access my account.

#### Acceptance Criteria

1. WHEN the Visitor_Status is `returning` AND the Selected_Role is `citizen`, THE Login_Page SHALL present a password sign-in form that admits only accounts whose role is `citizen`.
2. WHEN the Visitor_Status is `returning` AND the Selected_Role is `physician`, THE Login_Page SHALL present a password sign-in form that admits only accounts whose role is `physician`.
3. WHEN the Visitor_Status is `returning` AND the Selected_Role is `barangay_staff`, THE Login_Page SHALL present a password sign-in form that admits only accounts whose role is `barangay_staff`.
4. WHEN a returning user submits valid credentials whose account role matches the Selected_Role, THE Auth_Flow SHALL route that user to the Role_Home for that role.
5. IF a returning user authenticates successfully but the account role does not match the Selected_Role, THEN THE Auth_Flow SHALL end the authenticated session without routing to any Role_Home and display a portal-mismatch message resolved through the I18n_System.
6. IF a returning user submits credentials that fail authentication, THEN THE Login_Page SHALL retain the entered email value, clear the entered password value, and display an authentication-failure message resolved through the I18n_System.
7. IF a returning user submits the sign-in form with the email field or the password field empty, THEN THE Login_Page SHALL reject the submission without attempting authentication and display a required-field message resolved through the I18n_System.
8. IF a returning user reaches 5 consecutive failed authentication attempts for the same email within the current Login_Page session, THEN THE Login_Page SHALL block further submissions for that email for 15 minutes and display a temporary-lockout message resolved through the I18n_System.

### Requirement 5: New-user routing per role

**User Story:** As a new user, I want selecting my role to take me to the correct registration path, so that I can create the right kind of account.

#### Acceptance Criteria

1. WHEN the Visitor_Status is `new` AND the Selected_Role is `citizen`, THE Login_Page SHALL navigate the visitor to the citizen self-registration path.
2. WHEN the Visitor_Status is `new` AND the Selected_Role is `physician`, THE Login_Page SHALL navigate the visitor to the doctor application path.
3. WHEN the Visitor_Status is `new` AND the Selected_Role is `barangay_staff`, THE Login_Page SHALL display a message, resolved through the I18n_System, stating that Barangay_Staff accounts are created by an administrator and cannot be self-registered, and SHALL NOT navigate to any self-registration path.
4. WHILE the new-user Barangay_Staff message is displayed, THE Login_Page SHALL provide a control, with a touch target of at least 44 by 44 pixels, that returns the visitor to the Role_Step.
5. WHEN a new Citizen completes self-registration, THE Auth_Flow SHALL display a pending-verification message resolved through the I18n_System.
6. WHEN a new Physician completes an application, THE Auth_Flow SHALL display a pending-approval message resolved through the I18n_System.

### Requirement 6: Admin portal remains URL-only

**User Story:** As the product owner, I want the admin portal kept out of the public flow, so that administrator access is not advertised to ordinary visitors.

#### Acceptance Criteria

1. THE Auth_Flow SHALL NOT present an administrator choice, nor any link, button, or redirect to the admin login route, on the Landing_Page, the Status_Step, or the Role_Step.
2. WHEN a visitor navigates directly to the admin login route, THE Auth_Flow SHALL present the administrator sign-in form.
3. WHEN an administrator submits valid credentials at the admin login route, THE Auth_Flow SHALL route that administrator to the Role_Home for the `admin` role.
4. IF credentials submitted at the admin login route fail authentication, THEN THE admin login route SHALL retain the entered email value, clear the entered password value, and display an authentication-failure message resolved through the I18n_System without disclosing whether an administrator account exists.

### Requirement 7: Technology and accessibility conformance

**User Story:** As a maintainer, I want the reworked flow to follow the mandated stack and accessibility rules, so that it stays consistent with the rest of CareLink.

#### Acceptance Criteria

1. THE Auth_Flow screens SHALL be implemented as React Router v6 routes that are lazy loaded.
2. WHERE an Auth_Flow screen collects email and password input, THE Auth_Flow SHALL manage that input using React Hook Form with Zod validation, and IF a submitted value fails its Zod schema, THEN THE Auth_Flow SHALL block submission, retain all entered field values, and display a field-level error message indicating which field is invalid.
3. WHEN a user is authenticated, THE Auth_Flow SHALL route that user to the destination given by the Role_Home resolution provided by the Auth_Provider.
4. THE Auth_Flow SHALL render every interactive control with a minimum touch-target size of 44 pixels by 44 pixels.
5. WHILE rendered at a viewport width of 360 pixels, THE Auth_Flow SHALL display each step with no horizontal scrolling and no clipping or overlap of interactive controls.
6. THE Auth_Flow SHALL provide English and Filipino translations in the I18n_System for every user-facing key introduced by this feature.
7. WHEN a form validation error occurs, THE Auth_Flow SHALL render the error message within a container that carries an assertive alert role for assistive technologies.
8. IF a user-facing key introduced by this feature has no translation in the active I18n_System language, THEN THE Auth_Flow SHALL render the English translation for that key as a fallback.

### Requirement 8: Steering documents updated to the new flow

**User Story:** As a maintainer, I want the steering documents to describe the new staged entry flow, so that future contributors build to the intended design rather than the superseded single-login model.

#### Acceptance Criteria

1. THE Steering_Docs SHALL contain statements describing the Auth_Flow as a Landing_Page, a separate Login_Page, a Status_Step that precedes a Role_Step.
2. THE Steering_Docs SHALL NOT retain any statement asserting that CareLink uses a single `/login` page with no role selector, unless that statement is explicitly labeled as superseded by this flow.
3. THE Steering_Docs SHALL contain a public route map that includes the Landing_Page route, the Login_Page route, and reflects the staged Status_Step and Role_Step.
4. THE Steering_Docs SHALL state that Barangay_Staff accounts are seeded by an administrator and are not self-registered through the Auth_Flow.
5. THE Steering_Docs SHALL state that the administrator portal is reachable by direct URL only and is absent from every public Auth_Flow choice.
6. THE Steering_Docs SHALL retain the role names `admin`, `barangay_staff`, `physician`, and `citizen` with no pharmacist role introduced.
7. THE statements in `.kiro/steering/product.md` and `.kiro/steering/structure.md` describing the Auth_Flow SHALL NOT contradict each other.
