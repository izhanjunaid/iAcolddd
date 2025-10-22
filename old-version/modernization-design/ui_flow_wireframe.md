# UI Flow Wireframes: Key User Journeys
**Project:** Advance ERP Modernization  
**Date:** October 15, 2025  
**Purpose:** Visual representation of user flows and screen navigation

---

## Overview

This document contains Mermaid diagrams illustrating the key user journeys in the modernized Advance ERP system. Each flow shows the sequence of screens and decision points users encounter when performing common tasks.

---

## 1. Authentication Flow

### 1.1 Login Journey

```mermaid
graph TD
    Start([User visits app]) --> Login[Login Page]
    Login --> EnterCreds[Enter username & password]
    EnterCreds --> Submit{Submit}
    Submit --> ValidateCreds{Valid credentials?}
    ValidateCreds -->|No| ShowError[Show error message]
    ShowError --> EnterCreds
    ValidateCreds -->|Yes| CheckPerms{Has permissions?}
    CheckPerms -->|No| AccessDenied[Access Denied Page]
    CheckPerms -->|Yes| Dashboard[Dashboard]
    Dashboard --> End([User logged in])
```

### 1.2 Session Management

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    
    User->>Frontend: Login
    Frontend->>Backend: POST /auth/login
    Backend-->>Frontend: Access Token + Refresh Token
    Frontend->>Frontend: Store tokens
    Frontend-->>User: Redirect to Dashboard
    
    Note over User,Backend: ... 50 minutes later ...
    
    User->>Frontend: Make API call
    Frontend->>Backend: Request with expired token
    Backend-->>Frontend: 401 Unauthorized
    Frontend->>Backend: POST /auth/refresh (with refresh token)
    Backend-->>Frontend: New Access Token
    Frontend->>Backend: Retry request with new token
    Backend-->>Frontend: Success
    Frontend-->>User: Display data
```

---

## 2. Voucher Creation Flow

### 2.1 Journal Voucher Entry

```mermaid
graph TD
    Start([Accounting Module]) --> VouchersMenu[Click Vouchers]
    VouchersMenu --> VouchersList[Vouchers List Page]
    VouchersList --> ClickNew[Click 'New Voucher']
    ClickNew --> VoucherForm[Voucher Form Page]
    
    VoucherForm --> SelectType[Select Voucher Type: Journal/Payment/Receipt]
    SelectType --> EnterDate[Enter Voucher Date]
    EnterDate --> AddLine1[Add first line item]
    
    AddLine1 --> SelectAcc1[Select Account from dropdown]
    SelectAcc1 --> EnterAmount1[Enter Debit/Credit Amount]
    EnterAmount1 --> AddLine2[Add second line item]
    
    AddLine2 --> SelectAcc2[Select Account]
    SelectAcc2 --> EnterAmount2[Enter Amount]
    EnterAmount2 --> CheckBalance{Debit = Credit?}
    
    CheckBalance -->|No| ShowBalanceError[Show balance error]
    ShowBalanceError --> AddLine2
    CheckBalance -->|Yes| AddMoreLines{Add more lines?}
    
    AddMoreLines -->|Yes| AddLine2
    AddMoreLines -->|No| EnterDesc[Enter Description optional]
    EnterDesc --> Submit[Click Submit]
    
    Submit --> Validate{All validations pass?}
    Validate -->|No| ShowErrors[Show validation errors]
    ShowErrors --> VoucherForm
    Validate -->|Yes| CreateVoucher[Create Voucher API call]
    
    CreateVoucher --> Success{Success?}
    Success -->|No| ShowAPIError[Show error toast]
    ShowAPIError --> VoucherForm
    Success -->|Yes| ShowSuccess[Show success toast]
    ShowSuccess --> VoucherDetail[Navigate to Voucher Detail Page]
    
    VoucherDetail --> PostNow{Post voucher now?}
    PostNow -->|No| End([Voucher saved as draft])
    PostNow -->|Yes| PostVoucher[Click Post]
    PostVoucher --> ConfirmPost{Confirm post?}
    ConfirmPost -->|No| VoucherDetail
    ConfirmPost -->|Yes| PostAPI[Post Voucher API call]
    PostAPI --> Posted[Voucher Posted]
    Posted --> End2([Accounting entries created])
```

### 2.2 Voucher Screen States

```mermaid
stateDiagram-v2
    [*] --> Draft: Create Voucher
    Draft --> Editing: Edit
    Editing --> Draft: Save
    Draft --> Posted: Post
    Posted --> [*]: Complete
    
    Draft --> Deleted: Delete
    Deleted --> [*]
    
    Posted --> Unposted: Unpost (Admin only)
    Unposted --> Draft: Return to draft
    
    note right of Posted
        Cannot edit or delete
        when posted
    end note
```

---

## 3. GRN (Goods Receipt Note) Flow

### 3.1 Creating a GRN

```mermaid
graph TD
    Start([Warehouse Module]) --> WarehouseMenu[Warehouse Menu]
    WarehouseMenu --> GRNList[GRN List Page]
    GRNList --> ClickNewGRN[Click 'New GRN']
    ClickNewGRN --> GRNForm[GRN Form Page]
    
    GRNForm --> Step1[Step 1: Header Details]
    Step1 --> SelectSupplier[Select Supplier Account]
    SelectSupplier --> EnterDate[Enter GRN Date]
    EnterDate --> EnterVehicle[Enter Vehicle Number optional]
    EnterVehicle --> NextToDetails[Click Next]
    
    NextToDetails --> Step2[Step 2: Product Details]
    Step2 --> AddProduct[Add Product Line]
    AddProduct --> SelectProduct[Select Product]
    SelectProduct --> SelectVariety[Select Variety optional]
    SelectVariety --> SelectPacking[Select Packing type]
    SelectPacking --> SelectRoom[Select Storage Room]
    SelectRoom --> SelectRack[Select Rack optional]
    SelectRack --> EnterQty[Enter Quantity]
    EnterQty --> EnterRate[Enter Rate]
    EnterRate --> CalcAmount[Amount auto-calculated]
    
    CalcAmount --> AddBags{Track bag weights?}
    AddBags -->|Yes| BagDetails[Enter Bag Details Modal]
    BagDetails --> EnterBagNumber[Enter Bag Number]
    EnterBagNumber --> EnterWeight[Enter Weight]
    EnterWeight --> AddMoreBags{Add more bags?}
    AddMoreBags -->|Yes| EnterBagNumber
    AddMoreBags -->|No| SaveBags[Save Bag Details]
    SaveBags --> AddMoreProducts
    
    AddBags -->|No| AddMoreProducts{Add more products?}
    AddMoreProducts -->|Yes| AddProduct
    AddMoreProducts -->|No| Step3[Step 3: Labour & Carriage]
    
    Step3 --> EnterLabour[Enter Labour Amount optional]
    EnterLabour --> SelectLabourAcc[Select Labour Accounts]
    SelectLabourAcc --> EnterCarriage[Enter Carriage Amount optional]
    EnterCarriage --> ReviewGRN[Step 4: Review]
    
    ReviewGRN --> ShowSummary[Display GRN Summary]
    ShowSummary --> ConfirmCreate{Confirm?}
    ConfirmCreate -->|No| GoBack[Go back to edit]
    GoBack --> Step1
    ConfirmCreate -->|Yes| AutoPost{Auto-post voucher?}
    
    AutoPost --> SubmitGRN[Submit GRN]
    SubmitGRN --> CreateAPI[Create GRN API call]
    CreateAPI --> UpdateStock[Stock automatically updated]
    UpdateStock --> VoucherCreated{Voucher auto-created?}
    VoucherCreated -->|Yes| ShowVoucherLink[Show link to accounting voucher]
    VoucherCreated -->|No| NoVoucher[No voucher created]
    ShowVoucherLink --> SuccessPage[GRN Success Page]
    NoVoucher --> SuccessPage
    SuccessPage --> Actions{Next action?}
    
    Actions -->|Print GRN| PrintGRN[Generate PDF]
    Actions -->|View Details| GRNDetail[GRN Detail Page]
    Actions -->|New GRN| GRNForm
    Actions -->|Back to List| GRNList
```

### 3.2 GRN Form Layout

```
┌─────────────────────────────────────────────────────────────┐
│ New Goods Receipt Note (GRN)                    [X] Close   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ ① Header ──── ② Products ──── ③ Charges ──── ④ Review      │
│   [Active]     [Pending]       [Pending]       [Pending]     │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│  Step 1: Header Information                                  │
│                                                               │
│  GRN Date: [________] (calendar picker)                      │
│                                                               │
│  Supplier: [Select Supplier Account ▼]                       │
│            (Searchable dropdown with autocomplete)           │
│                                                               │
│  Vehicle Number: [__________] (optional)                     │
│                                                               │
│  Invoice Grace Days: [___] days                              │
│                                                               │
│  Remarks: [_____________________________________]            │
│           [_____________________________________]            │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│  [Cancel]                                [Next: Products →]  │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Invoice Generation Flow

### 4.1 Creating an Invoice

```mermaid
graph TD
    Start([Billing Module]) --> InvoiceList[Invoices List Page]
    InvoiceList --> NewInvoice[Click 'New Invoice']
    NewInvoice --> InvoiceForm[Invoice Form]
    
    InvoiceForm --> SelectCustomer[Select Customer Account]
    SelectCustomer --> EnterDate[Enter Invoice Date]
    EnterDate --> SelectGRN[Select GRN Details to Bill]
    
    SelectGRN --> GRNModal[GRN Selection Modal]
    GRNModal --> FilterGRN{Filter GRNs}
    FilterGRN --> ShowAvailable[Show unbilled GRN items for customer]
    ShowAvailable --> SelectItems[Select GRN line items to bill]
    SelectItems --> SetPeriod[Set Invoice Period: Daily/Seasonal/Monthly]
    SetPeriod --> SetRate[Set Rate per unit]
    SetRate --> CalcMonths[System calculates storage months]
    
    CalcMonths --> ShowCalc[Display calculation breakdown]
    ShowCalc --> AddLabour[Add labour charges from GDN/transfers]
    AddLabour --> AddLoading[Add loading charges]
    AddLoading --> SubtotalCalc[Subtotal calculated]
    
    SubtotalCalc --> AddTaxes[Add Taxes]
    AddTaxes --> IncomeTax[Set Income Tax %]
    IncomeTax --> Withholding[Set Withholding Tax %]
    Withholding --> TotalCalc[Total amount calculated]
    
    TotalCalc --> CashReceived{Cash received?}
    CashReceived -->|Yes| EnterCash[Enter cash amount]
    EnterCash --> Balance[Balance calculated]
    CashReceived -->|No| Balance
    
    Balance --> Review[Review Invoice]
    Review --> Submit{Submit}
    Submit -->|Cancel| InvoiceList
    Submit -->|Save| CreateInvoice[Create Invoice API]
    
    CreateInvoice --> AutoPostVoucher{Auto-post accounting voucher?}
    AutoPostVoucher -->|Yes| PostVoucherAPI[Create & Post Voucher]
    AutoPostVoucher -->|No| SaveOnly[Save as Draft]
    
    PostVoucherAPI --> InvoiceCreated[Invoice Created & Posted]
    SaveOnly --> InvoiceCreated
    
    InvoiceCreated --> NextAction{Next action?}
    NextAction -->|Print| GeneratePDF[Generate Invoice PDF]
    NextAction -->|Email| SendEmail[Send Email to Customer]
    NextAction -->|View| InvoiceDetail[View Invoice Details]
    NextAction -->|New| InvoiceForm
```

### 4.2 Invoice Calculation Breakdown Component

```
┌──────────────────────────────────────────────────────┐
│ Invoice Line Items                                    │
├──────────────────────────────────────────────────────┤
│                                                        │
│ Line 1:                                                │
│   Product: Red Potato Ration                          │
│   Quantity: 100 bags                                   │
│   Rate: PKR 50 per bag per month                       │
│   Storage Period: 45 days (1.5 months calculated)     │
│   Gross Amount: PKR 7,500                              │
│   Labour Charges: PKR 200                              │
│   Loading Charges: PKR 100                             │
│   Line Total: PKR 7,800                                │
│                                                        │
│ [+ Add Another Line]                                   │
│                                                        │
├──────────────────────────────────────────────────────┤
│ Summary                                                │
│   Subtotal:           PKR 7,800.00                     │
│   Income Tax (5%):    PKR   390.00 [+]                 │
│   Withholding (1%):   PKR   (78.00) [-]                │
│   ─────────────────────────────────                   │
│   Total Amount:       PKR 8,112.00                     │
│                                                        │
│   Cash Received:      PKR 5,000.00 [Edit]             │
│   Balance:            PKR 3,112.00                     │
└──────────────────────────────────────────────────────┘
```

---

## 5. Dashboard Navigation

### 5.1 Main Dashboard Flow

```mermaid
graph TD
    Login([User Logs In]) --> Dashboard[Dashboard Home]
    
    Dashboard --> StatCards[Display Stat Cards]
    StatCards --> TotalRevenue[Total Revenue MTD]
    StatCards --> Outstanding[Outstanding Invoices]
    StatCards --> TodayGRN[Today's GRNs]
    StatCards --> StockLevel[Current Stock Level]
    
    Dashboard --> Charts[Display Charts]
    Charts --> RevenueChart[Revenue Trend Chart]
    Charts --> StockChart[Stock Movement Chart]
    
    Dashboard --> RecentActivity[Recent Activity Feed]
    RecentActivity --> ActivityItem[Recent GRNs, Invoices, Vouchers]
    
    Dashboard --> QuickActions[Quick Action Buttons]
    QuickActions --> QANewGRN[New GRN]
    QuickActions --> QANewInvoice[New Invoice]
    QuickActions --> QANewVoucher[New Voucher]
    QuickActions --> QAReports[View Reports]
    
    Dashboard --> Sidebar[Sidebar Navigation]
    Sidebar --> AccModule[Accounting Module]
    Sidebar --> WhModule[Warehouse Module]
    Sidebar --> BillModule[Billing Module]
    Sidebar --> RepModule[Reports Module]
    Sidebar --> SettingsModule[Settings]
    
    AccModule --> AccSubMenu{Submenu}
    AccSubMenu --> Accounts[Chart of Accounts]
    AccSubMenu --> Vouchers[Vouchers]
    AccSubMenu --> AccReports[Accounting Reports]
    
    WhModule --> WhSubMenu{Submenu}
    WhSubMenu --> GRN[GRN]
    WhSubMenu --> GDN[GDN]
    WhSubMenu --> Transfers[Inter-room Transfers]
    WhSubMenu --> Stock[Stock Management]
    
    BillModule --> Invoices[Invoices]
    BillModule --> Payments[Payment Tracking]
```

### 5.2 Dashboard Layout

```
┌────────────────────────────────────────────────────────────────┐
│  Advance ERP                    [🔍 Search]  [🔔]  [👤 Admin ▼]│
├──────┬─────────────────────────────────────────────────────────┤
│      │  Dashboard                                   Oct 15, 2025│
│  🏠  │                                                           │
│      │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│ Acc. │  │ Total Revenue│ │ Outstanding  │ │  Today's GRNs│    │
│  ▼   │  │  PKR 2.5M    │ │  PKR 450K    │ │      12      │    │
│      │  │  ↑ 12% MTD   │ │  18 invoices │ │   ↑ 3 more   │    │
│ War. │  └──────────────┘ └──────────────┘ └──────────────┘    │
│  ▼   │                                                           │
│      │  Revenue Trend (Last 30 Days)                            │
│ Bill │  ┌─────────────────────────────────────────────────┐    │
│  ▼   │  │        ╱╲                                       │    │
│      │  │     ╱╲╱  ╲    ╱╲                                │    │
│ Rep. │  │  ╱╲╱      ╲╱╲╱  ╲                               │    │
│  ▼   │  │╱                 ╲                              │    │
│      │  └─────────────────────────────────────────────────┘    │
│ Set. │                                                           │
│      │  Recent Activity                  Quick Actions          │
│      │  ┌─────────────────────────────┐ ┌─────────────────┐   │
│      │  │ GRN-2025-0123 created       │ │  + New GRN      │   │
│      │  │ 2 mins ago                  │ │  + New Invoice  │   │
│      │  │                             │ │  + New Voucher  │   │
│      │  │ INV-2025-0456 posted        │ │  📊 Reports     │   │
│      │  │ 15 mins ago                 │ └─────────────────┘   │
│      │  └─────────────────────────────┘                        │
└──────┴─────────────────────────────────────────────────────────┘
```

---

## 6. Report Generation Flow

### 6.1 Trial Balance Report

```mermaid
graph TD
    Start([Reports Module]) --> ReportsPage[Reports Page]
    ReportsPage --> SelectReport[Select Report Type]
    SelectReport --> TrialBalance[Trial Balance]
    
    TrialBalance --> FilterForm[Report Filters Form]
    FilterForm --> SelectDates[Select Date Range]
    SelectDates --> StartDate[From Date]
    StartDate --> EndDate[To Date]
    EndDate --> SelectFormat[Select Format: PDF/Excel]
    SelectFormat --> Submit[Generate Report]
    
    Submit --> Validate{Valid dates?}
    Validate -->|No| ShowError[Show validation error]
    ShowError --> FilterForm
    Validate -->|Yes| QueueJob[Queue report job]
    
    QueueJob --> ShowProgress[Show progress indicator]
    ShowProgress --> PollStatus[Poll job status every 2 seconds]
    PollStatus --> CheckStatus{Job complete?}
    
    CheckStatus -->|No| PollStatus
    CheckStatus -->|Failed| ShowFailed[Show error message]
    CheckStatus -->|Yes| ReportReady[Report Ready]
    
    ReportReady --> Notification[Show success notification]
    Notification --> Actions{User action}
    Actions -->|Download| DownloadFile[Download file]
    Actions -->|Preview| PreviewInBrowser[Preview in browser]
    Actions -->|Email| EmailDialog[Email dialog]
    Actions -->|Close| ReportsPage
```

### 6.2 Report Progress UI

```
┌──────────────────────────────────────────────────┐
│ Generating Trial Balance Report...               │
├──────────────────────────────────────────────────┤
│                                                    │
│  ⚙️  Fetching account data...                     │
│                                                    │
│  [████████████████████████████        ] 75%       │
│                                                    │
│  Estimated time remaining: 15 seconds              │
│                                                    │
│  [Cancel Generation]                               │
│                                                    │
└──────────────────────────────────────────────────┘
```

---

## 7. User Management Flow

### 7.1 Creating a User

```mermaid
graph TD
    Start([Settings Module]) --> Settings[Settings Page]
    Settings --> UsersTab[Users & Roles Tab]
    UsersTab --> UsersList[Users List]
    UsersList --> ClickNew[Click 'Add User']
    ClickNew --> UserForm[User Form Modal]
    
    UserForm --> EnterBasic[Enter Basic Info]
    EnterBasic --> Username[Username]
    Username --> Email[Email]
    Email --> FullName[Full Name]
    FullName --> Password[Password]
    Password --> ConfirmPwd[Confirm Password]
    
    ConfirmPwd --> SelectRoles[Select Roles]
    SelectRoles --> RolesList[Display available roles]
    RolesList --> CheckRoles[Check roles: Admin/Manager/User/Viewer]
    CheckRoles --> CustomPerms{Customize permissions?}
    
    CustomPerms -->|Yes| PermissionsMatrix[Permissions Matrix]
    PermissionsMatrix --> SetPerms[Set granular permissions]
    SetPerms --> Review[Review selections]
    
    CustomPerms -->|No| Review
    Review --> SaveUser[Click Save]
    
    SaveUser --> Validate{Valid?}
    Validate -->|No| ShowErrors[Show validation errors]
    ShowErrors --> UserForm
    Validate -->|Yes| CreateAPI[Create User API]
    
    CreateAPI --> Success{Success?}
    Success -->|No| ShowAPIError[Show error]
    ShowAPIError --> UserForm
    Success -->|Yes| UserCreated[User created]
    UserCreated --> SendInvite{Send invitation email?}
    
    SendInvite -->|Yes| EmailSent[Send credentials via email]
    SendInvite -->|No| DisplayCreds[Display credentials on screen]
    EmailSent --> UsersList
    DisplayCreds --> UsersList
```

---

## 8. Account Selection Component (Reusable)

### 8.1 Account Selector Flow

```mermaid
graph TD
    Start([User clicks Account field]) --> Dropdown[Account Dropdown Opens]
    Dropdown --> Search{User starts typing?}
    
    Search -->|Yes| FilterAccounts[Filter accounts by code/name]
    FilterAccounts --> ShowFiltered[Show filtered results]
    ShowFiltered --> SelectAcc[User selects account]
    
    Search -->|No| ShowAll[Show all detail accounts]
    ShowAll --> Pagination[Paginated list]
    Pagination --> SelectAcc
    
    SelectAcc --> ValidateAcc{Account is detail type?}
    ValidateAcc -->|No| ShowError[Show error: Must select detail account]
    ShowError --> Dropdown
    ValidateAcc -->|Yes| FillField[Fill account field]
    FillField --> ShowInfo[Show account info tooltip]
    ShowInfo --> End([Account selected])
```

### 8.2 Account Selector UI

```
┌──────────────────────────────────────────────────┐
│ Select Account                                    │
├──────────────────────────────────────────────────┤
│ [🔍 Search by code or name... _____________]     │
├──────────────────────────────────────────────────┤
│                                                    │
│ ▼ 01 - Assets                                     │
│   ▶ 01-01 - Fixed Assets                          │
│   ▼ 01-02 - Current Assets                        │
│     ▶ 01-02-01 - Inventory                        │
│     ▶ 01-02-02 - Accounts Receivable              │
│                                                    │
│ ▼ 02 - Potato Customers                           │
│     02001 - Customer A ⭐                          │
│     02002 - Customer B                             │
│     02003 - Customer C                             │
│                                                    │
│ ▶ 03 - Bank Accounts                              │
│ ▶ 04 - Cash Accounts                              │
│                                                    │
└──────────────────────────────────────────────────┘
```

---

## 9. Mobile Responsive Flow

### 9.1 Mobile Navigation

```mermaid
graph TD
    MobileStart([User on mobile]) --> MobileHome[Dashboard Mobile View]
    MobileHome --> HamburgerMenu[Tap hamburger menu ☰]
    HamburgerMenu --> SideDrawer[Side drawer opens]
    
    SideDrawer --> SelectModule{Select module}
    SelectModule --> AccMobile[Accounting]
    SelectModule --> WhMobile[Warehouse]
    SelectModule --> BillMobile[Billing]
    
    AccMobile --> AccScreen[Accounting Screen]
    AccScreen --> ListViewMobile[List View - Cards/Rows]
    ListViewMobile --> TapItem[Tap item]
    TapItem --> DetailScreen[Detail Screen - Full screen]
    DetailScreen --> ActionButton[Floating Action Button]
    ActionButton --> Edit[Edit/Delete/Post actions]
    
    DetailScreen --> BackButton[Back button]
    BackButton --> ListViewMobile
```

### 9.2 Mobile Screen Flow

```
Mobile: List View          Mobile: Detail View
┌─────────────────┐       ┌─────────────────┐
│ ← Vouchers      │       │ ← Back    ⋮ Menu│
├─────────────────┤       ├─────────────────┤
│                 │       │ JV-2025-0001    │
│ ┌─────────────┐│       │ Jan 15, 2025    │
│ │ JV-2025-0001││       │                 │
│ │ Jan 15      ││       │ Description:    │
│ │ PKR 50,000  ││       │ Rent Payment    │
│ │ Posted ✓    ││       │                 │
│ └─────────────┘│       │ Lines:          │
│                 │       │ ┌─────────────┐│
│ ┌─────────────┐│       │ │ Cash A/c    ││
│ │ JV-2025-0002││  -->  │ │ Dr: 50,000  ││
│ │ Jan 16      ││       │ └─────────────┘│
│ │ PKR 25,000  ││       │ ┌─────────────┐│
│ │ Draft       ││       │ │ Rent Exp.   ││
│ └─────────────┘│       │ │ Cr: 50,000  ││
│                 │       │ └─────────────┘│
│      [+]        │       │                 │
└─────────────────┘       │   [Edit] [Post] │
                          └─────────────────┘
```

---

## 10. Error Handling & User Feedback

### 10.1 Error Scenarios

```mermaid
graph TD
    UserAction([User submits form]) --> Validate{Frontend validation}
    Validate -->|Fail| ShowFieldErrors[Show field-level errors]
    ShowFieldErrors --> UserCorrects[User corrects]
    UserCorrects --> Validate
    
    Validate -->|Pass| APICall[Make API call]
    APICall --> NetworkCheck{Network available?}
    
    NetworkCheck -->|No| OfflineError[Show offline message]
    OfflineError --> Retry{Retry?}
    Retry -->|Yes| APICall
    Retry -->|No| SaveDraft[Save draft locally]
    
    NetworkCheck -->|Yes| ServerResponse{Server response}
    ServerResponse -->|400 Bad Request| ShowValidationErrors[Show server validation errors]
    ServerResponse -->|401 Unauthorized| RefreshToken[Attempt token refresh]
    RefreshToken --> RetryAPI[Retry API call]
    ServerResponse -->|403 Forbidden| ShowPermError[Show permission error]
    ServerResponse -->|404 Not Found| ShowNotFound[Show not found error]
    ServerResponse -->|500 Server Error| ShowServerError[Show server error - retry available]
    ServerResponse -->|200 Success| ShowSuccess[Show success toast]
    
    ShowSuccess --> UpdateUI[Update UI]
    ShowSuccess --> LogAudit[Log to audit trail]
```

### 10.2 Notification Types

```
Success Notification
┌──────────────────────────────────────┐
│ ✓ Voucher created successfully!      │
│   View Details →                      │
└──────────────────────────────────────┘

Error Notification
┌──────────────────────────────────────┐
│ ⚠ Failed to post voucher             │
│   Debit and credit must be equal     │
│   [Retry] [Dismiss]                   │
└──────────────────────────────────────┘

Info Notification
┌──────────────────────────────────────┐
│ ℹ Report generation started          │
│   You'll be notified when ready      │
└──────────────────────────────────────┘

Loading State
┌──────────────────────────────────────┐
│ ⏳ Creating voucher...                │
│   [■■■■■■■□□□□□□□□] 50%              │
└──────────────────────────────────────┘
```

---

## 11. Permission-Based UI

### 11.1 Conditional Rendering

```mermaid
graph TD
    PageLoad([User loads page]) --> CheckAuth{Authenticated?}
    CheckAuth -->|No| LoginRedirect[Redirect to login]
    CheckAuth -->|Yes| GetPerms[Get user permissions]
    
    GetPerms --> RenderPage[Render page skeleton]
    RenderPage --> CheckViewPerm{Has view permission?}
    
    CheckViewPerm -->|No| ShowAccessDenied[Show access denied]
    CheckViewPerm -->|Yes| ShowContent[Show content]
    
    ShowContent --> CheckCreatePerm{Has create permission?}
    CheckCreatePerm -->|Yes| ShowCreateBtn[Show 'New' button]
    CheckCreatePerm -->|No| HideCreateBtn[Hide 'New' button]
    
    ShowContent --> CheckEditPerm{Has edit permission?}
    CheckEditPerm -->|Yes| ShowEditBtn[Show edit buttons]
    CheckEditPerm -->|No| HideEditBtn[Hide/disable edit buttons]
    
    ShowContent --> CheckDeletePerm{Has delete permission?}
    CheckDeletePerm -->|Yes| ShowDeleteBtn[Show delete buttons]
    CheckDeletePerm -->|No| HideDeleteBtn[Hide delete buttons]
    
    ShowContent --> CheckPostPerm{Has post permission?}
    CheckPostPerm -->|Yes| ShowPostBtn[Show post buttons]
    CheckPostPerm -->|No| HidePostBtn[Hide post buttons]
```

### 11.2 Permission Matrix Example

```
User: John Doe (Role: Manager)

Module         | View | Create | Edit | Delete | Post
─────────────────────────────────────────────────────
Accounts       |  ✓   |   ✓    |  ✓   |   ✗    |  N/A
Vouchers       |  ✓   |   ✓    |  ✓   |   ✗    |  ✓
GRN            |  ✓   |   ✓    |  ✓   |   ✗    |  N/A
Invoices       |  ✓   |   ✓    |  ✓   |   ✓    |  ✓
Reports        |  ✓   |   ✓    | N/A  |  N/A   |  N/A
Users          |  ✗   |   ✗    |  ✗   |   ✗    |  N/A
Settings       |  ✗   |   ✗    |  ✗   |   ✗    |  N/A

✓ = Allowed    ✗ = Denied    N/A = Not applicable
```

---

## 12. Real-Time Updates (WebSocket)

### 12.1 WebSocket Event Flow

```mermaid
sequenceDiagram
    participant User1 as User 1 Browser
    participant Server
    participant User2 as User 2 Browser
    
    User1->>Server: Connect WebSocket (with JWT)
    Server-->>User1: Connected
    User2->>Server: Connect WebSocket (with JWT)
    Server-->>User2: Connected
    
    Note over User1,User2: Both users on Dashboard
    
    User1->>Server: Create GRN (HTTP POST)
    Server-->>User1: GRN Created
    Server->>User1: WS: grn:created event
    User1->>User1: Update GRN list
    Server->>User2: WS: grn:created event
    User2->>User2: Show notification + update dashboard
    
    Note over User1,User2: User 2 opens same GRN
    
    User2->>Server: Join GRN room (subscribe)
    User1->>Server: Update GRN (HTTP PATCH)
    Server-->>User1: GRN Updated
    Server->>User2: WS: grn:updated event
    User2->>User2: Show "Document updated by User1" banner
    User2->>User2: Offer to reload
```

### 12.2 Real-Time Notification UI

```
┌──────────────────────────────────────────────────┐
│ Dashboard                               🔔 (3)    │
├──────────────────────────────────────────────────┤
│                                                    │
│ 💡 GRN-2025-0145 was created by Ahmed             │
│    2 seconds ago • View →                          │
│                                                    │
│ 💡 Invoice INV-2025-0567 was posted by Sara       │
│    1 minute ago • View →                           │
│                                                    │
│ 💡 Voucher JV-2025-0890 awaiting your approval    │
│    5 minutes ago • Approve →                       │
│                                                    │
└──────────────────────────────────────────────────┘
```

---

## Conclusion

These UI flows provide a comprehensive view of user interactions in the modernized Advance ERP system. Key takeaways:

1. **Guided workflows** - Step-by-step processes for complex operations
2. **Clear navigation** - Intuitive menu structure and breadcrumbs
3. **Responsive design** - Optimized for desktop and mobile
4. **Permission-based UI** - Dynamic rendering based on user roles
5. **Real-time updates** - WebSocket-powered live notifications
6. **Error handling** - Comprehensive feedback for all scenarios
7. **Accessibility** - Keyboard navigation and screen reader support

**Next Steps:**
- Create high-fidelity mockups in Figma
- Build interactive prototypes
- Conduct user testing with stakeholders
- Refine based on feedback

---

**Document Version:** 1.0  
**Author:** ERP Modernization AI Architect  
**Related Documents:** `frontend_structure.md`, `api_spec.yaml`, `backend_blueprint.md`

