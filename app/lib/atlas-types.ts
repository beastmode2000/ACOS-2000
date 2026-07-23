export type Screen =
  | "dashboard"
  | "portfolio"
  | "map"
  | "locations"
  | "assets"
  | "history"
  | "requests"
  | "inbox"
  | "vendors"
  | "contacts"
  | "calendar"
  | "planner"
  | "weather"
  | "documents"
  | "manuals"
  | "intake"
  | "procedures"
  | "routines"
  | "parts"
  | "links"
  | "qr"
  | "scan"
  | "assistant";

export type Status = "Online" | "Offline" | "Seasonal" | "Monitor";

export type ServiceStatus =
  | "Open"
  | "Scheduled"
  | "Completed"
  | "Monitor"
  | "In Progress"
  | "Waiting";

export type WorkOrderPriority = "Low" | "Medium" | "High";

export type WorkOrderRecurrenceUnit = "Days" | "Weeks" | "Months" | "Years";

export type WorkSeason =
  | "Year-Round"
  | "Spring"
  | "Summer"
  | "Fall"
  | "Winter";

export type Priority = "High" | "Normal" | "Seasonal";

export type PartStatus = "In Stock" | "Low" | "Out" | "Order";

export type UploadedFileRecord = {
  id: string;
  name: string;
  type?: string;
  dataUrl?: string;
  url?: string;
  createdAt?: string;
};

export type LocationRecord = {
  propertyId?: string;
  id: string;
  name: string;
  type: string;
  zone: string;
  notes: string;
};

export type MapDetailBox = {
  id: string;
  title: string;
  body: string;
};

export type MapLabelRecord = {
  id: string;
  label: string;
  category: string;
  x: number;
  y: number;
  notes: string;
  photos: UploadedFileRecord[];
  coverPhotoId?: string;
  vendorIds?: string[];
  detailBoxes?: MapDetailBox[];
  installer?: string;
  paintColor?: string;
  specs?: string;
  documentNotes?: string;
  photoNotes?: string;
  maintenanceNotes?: string;
};

export type VendorRecord = {
  id: string;
  name: string;
  category: string;
  phone?: string;
  email?: string;
  website?: string;
  notes: string;
};

export type ContactRecord = {
  id: string;
  name: string;
  organization: string;
  role: string;
  category: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  birthday?: string;
  notes: string;
};

export type AssetRecord = {
  propertyId?: string;
  id: string;
  name: string;
  locationId: string;
  category: string;
  status: Status;
  make?: string;
  model?: string;
  year?: string;
  manufacturer?: string;
  serial?: string;
  notes: string;
  vendorIds: string[];
};

export type ServiceRecord = {
  propertyId?: string;
  id: string;
  assetId: string;
  vendorId?: string;
  procedureId?: string;
  date: string;
  title: string;
  status: ServiceStatus;
  priority?: WorkOrderPriority;
  notes: string;
  followUpDate?: string;
  recurring?: boolean;
  recurrenceInterval?: number;
  recurrenceUnit?: WorkOrderRecurrenceUnit;
  recurrenceEndDate?: string;
  season?: WorkSeason;
  lastCompletedDate?: string;
  completionHistory?: string[];
  estimatedCost?: number;
  actualCost?: number;
  invoiceNumber?: string;
  photos?: UploadedFileRecord[];
  documents?: UploadedFileRecord[];
};

export type ProcedureStatus =
  | "Draft"
  | "SOP"
  | "Preventive Maintenance"
  | "Landscaping";

export type ChecklistItem = {
  id: string;
  text: string;
  completed: boolean;
  order: number;
};

export type ProcedureRecord = {
  id: string;
  title: string;
  area: string;
  category?: string;
  priority: Priority;
  status?: ProcedureStatus;
  purpose?: string;
  safetyNotes?: string;
  toolsParts?: string;
  requiredTools?: string[];
  requiredParts?: string[];
  estimatedTime?: string;
  steps: string[];
  checklist?: ChecklistItem[];
  linkedAssetIds?: string[];
  linkedLocationIds?: string[];
  linkedVendorIds?: string[];
  photos?: UploadedFileRecord[];
  documents?: UploadedFileRecord[];
  createdAt?: string;
  updatedAt?: string;
};

export type RequestStatus =
  | "New"
  | "Under Review"
  | "Approved"
  | "Converted to Work Order"
  | "Declined"
  | "Closed";

export type OwnerRequestRecord = {
  id: string;
  requesterName: string;
  requesterContact: string;
  title: string;
  description: string;
  locationName: string;
  assetName: string;
  priority: WorkOrderPriority;
  preferredTiming: string;
  category: string;
  status: RequestStatus;
  photos: UploadedFileRecord[];
  adminNotes: string;
  convertedWorkOrderId: string;
  completedAt: string;
  submittedAt: string;
  updatedAt: string;
};

export type IntakeTargetKind =
  | "General"
  | "Asset"
  | "Location"
  | "Vendor"
  | "Work Order"
  | "Map Label";

export type FastIntakeKind =
  | "Asset Label"
  | "Invoice / Receipt"
  | "Work Order Issue"
  | "Document"
  | "Gauge / Meter Reading"
  | "General Photo";

export type FastIntakeSaveMode =
  | "Attach to Existing"
  | "Create Work Order"
  | "Create Asset"
  | "Create Vendor"
  | "Document Only";

export type InboxStatus =
  | "New"
  | "Analyzed"
  | "Needs Review"
  | "Approved"
  | "Saved"
  | "Archived"
  | "Error";

export type InboxReviewDraft = {
  documentType: string;
  summary: string;
  manufacturer: string;
  model: string;
  serial: string;
  invoiceNumber: string;
  amount: string;
  date: string;
  psi: string;
  temperature: string;
  ph: string;
  hours: string;
  assetId: string;
  locationId: string;
  vendorId: string;
  workOrderId: string;
  notes: string;
};

export type InboxItemRecord = {
  id: string;
  title: string;
  intakeType: FastIntakeKind;
  status: InboxStatus;
  source: string;
  notes: string;
  pastedText: string;
  files: UploadedFileRecord[];
  targetType: IntakeTargetKind;
  targetId: string;
  targetName: string;
  proposedAction: FastIntakeSaveMode;
  extractedData: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type DocumentRecord = {
  propertyId?: string;
  id: string;
  title: string;
  area: string;
  type: string;
  linkedAssetId?: string;
  linkedVendorId?: string;
  targetType?: IntakeTargetKind;
  targetId?: string;
  targetName?: string;
  notes: string;
  pastedText?: string;
  files?: UploadedFileRecord[];
  href?: string;
  createdAt?: string;
};

export type ManualCategory =
  | "Operator / Owner Manuals"
  | "Installation Manuals"
  | "Service / Repair Manuals"
  | "Maintenance Guides"
  | "Parts Catalogs"
  | "Wiring Diagrams"
  | "Technical Specifications"
  | "Quick Start Guides"
  | "Warranty Documents"
  | "Safety / Compliance Documents";

export type ManualRecord = {
  id: string;
  title: string;
  category: ManualCategory;
  manufacturer: string;
  model: string;
  documentNumber: string;
  linkedAssetId?: string;
  linkedAssetName?: string;
  sourceLabel: string;
  href: string;
  notes: string;
  files: UploadedFileRecord[];
  createdAt: string;
};

export type PartRecord = {
  propertyId?: string;
  id: string;
  name: string;
  category: string;
  locationId: string;
  assetId?: string;
  vendorId?: string;
  quantity: number;
  minQuantity: number;
  status: PartStatus;
  notes: string;
};

export type WorkLinkRecord = {
  id: string;
  name: string;
  category: string;
  vendor?: string;
  url: string;
  logoText: string;
  logoBg: string;
  logoUrl?: string;
  logoColor?: string;
  notes: string;
};

export type QrKind = "asset" | "location" | "vendor" | "map";

export type QrRecord = {
  kind: QrKind;
  id: string;
  title: string;
  subtitle: string;
  detail: string;
};

export type CalendarColorName =
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "gray";

export type CalendarRepeat =
  | "None"
  | "Daily"
  | "Weekly"
  | "Monthly"
  | "Yearly"
  | "Custom";

export type CalendarReminder =
  | "None"
  | "Morning of"
  | "Day before"
  | "Week before";

export type CalendarLinkType =
  | "None"
  | "Asset"
  | "Location"
  | "Vendor"
  | "Work Order";

export type CalendarSource =
  | "manual"
  | "us-holiday"
  | "jewish-holiday"
  | "work-order";

export type CalendarColor = {
  id: string;
  label: string;
  hex: string;
  colorName?: CalendarColorName;
};

export type CalendarItem = {
  propertyId?: string;
  id: string;
  date: string;
  time?: string;
  title: string;
  area: string;
  categoryLabel?: string;
  colorId?: string;
  colorName?: CalendarColorName;
  allDay?: boolean;
  repeat?: CalendarRepeat;
  reminder?: CalendarReminder;
  notes?: string;
  linkedType?: CalendarLinkType;
  linkedId?: string;
  linkedName?: string;
  completed?: boolean;
  completedDates?: string[];
  source?: CalendarSource;
  originalId?: string;
  instanceId?: string;
  status?: ServiceStatus;
};

export type WorkPlanDay =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday";

export type WorkPlanTask = {
  id: string;
  title: string;
  minutes: number;
  priority: WorkOrderPriority;
  category: string;
  locationId: string;
  preferredDay: WorkPlanDay | "Auto";
  scheduledDay?: WorkPlanDay;
  scheduledDate?: string;
  locked?: boolean;
  recurring?: boolean;
  fixedTime?: string;
  notes?: string;
};

export type PhotoRecord = {
  propertyId?: string;
  id: string;
  assetId: string;
  name: string;
  dataUrl?: string;
  url?: string;
  createdAt?: string;
};

export type WeatherDay = {
  date: string;
  code: number;
  high: number;
  low: number;
  precipChance: number;
  precipAmount: number;
  windMax: number;
  et0: number;
};

export type AtlasApiPayload = {
  ok?: boolean;
  source?: string;
  error?: string;
  locations?: LocationRecord[];
  assetRecords?: AssetRecord[];
  assets?: AssetRecord[];
  vendorRecords?: VendorRecord[];
  vendors?: VendorRecord[];
  contactRecords?: ContactRecord[];
  contacts?: ContactRecord[];
  serviceRecords?: ServiceRecord[];
  workOrders?: ServiceRecord[];
  procedureRecords?: ProcedureRecord[];
  procedures?: ProcedureRecord[];
  calendarItems?: CalendarItem[];
  calendar?: CalendarItem[];
  parts?: PartRecord[];
  partRecords?: PartRecord[];
  photos?: PhotoRecord[];
  assetPhotos?: PhotoRecord[];
};

export type AtlasTable =
  | "locations"
  | "assets"
  | "vendors"
  | "contacts"
  | "work_orders"
  | "procedures"
  | "routines"
  | "calendar"
  | "parts"
  | "asset_photos";

export type SearchResult = {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  detail: string;
  screen: Screen;
  locationId?: string;
  assetId?: string;
  vendorId?: string;
  contactId?: string;
  serviceId?: string;
  mapLabelId?: string;
  procedureId?: string;
  calendarId?: string;
  partId?: string;
  requestId?: string;
  manualId?: string;
  relatedIds?: string[];
};

export type ManualCandidate = {
  title: string;
  manufacturer: string;
  model: string;
  url: string;
  sourceDomain: string;
  sourceLabel: string;
  confidence: "High" | "Medium" | "Low";
  reason: string;
  assetId?: string;
  assetName?: string;
};
