import type { Metadata, Viewport } from "next";
import "./atlas-typography.css";
import "./atlas-visual-system.css";
import AtlasLocationsPolish from "./components/AtlasLocationsPolish";
import AtlasLocationsAssetStyle from "./components/AtlasLocationsAssetStyle";
import AtlasLocationSectionTabs from "./components/AtlasLocationSectionTabs";
import AtlasLocationsViewportPolish from "./components/AtlasLocationsViewportPolish";
import AtlasLocationDetailPolish from "./components/AtlasLocationDetailPolish";
import AtlasLocationPhotoEditor from "./components/AtlasLocationPhotoEditor";
import AtlasLocationMainPhotoControl from "./components/AtlasLocationMainPhotoControl";
import AtlasPropertyVisibility from "./components/AtlasPropertyVisibility";
import AtlasWorkspacePolish from "./components/AtlasWorkspacePolish";
import AtlasKnowledgePolish from "./components/AtlasKnowledgePolish";
import AtlasAssetReferencePolish from "./components/AtlasAssetReferencePolish";
import AtlasAssetAdditionalInfo from "./components/AtlasAssetAdditionalInfo";
import AtlasAssetEditVisibilityFix from "./components/AtlasAssetEditVisibilityFix";
import AtlasAssetsViewportPolish from "./components/AtlasAssetsViewportPolish";
import AtlasDepartmentAssetPhotoPolish from "./components/AtlasDepartmentAssetPhotoPolish";
import AtlasWorkPolish from "./components/AtlasWorkPolish";
import AtlasWorkCategoryCanonicalizer from "./components/AtlasWorkCategoryCanonicalizer";
import AtlasWorkEditorCleanup from "./components/AtlasWorkEditorCleanup";
import AtlasWorkWeekWrap from "./components/AtlasWorkWeekWrap";
import AtlasDashboardNoteActionsPolish from "./components/AtlasDashboardNoteActionsPolish";
import AtlasDashboardUpcomingWork from "./components/AtlasDashboardUpcomingWork";
import AtlasDashboardDefaultUpcoming from "./components/AtlasDashboardDefaultUpcoming";
import AtlasHydrawiseWeatherLink from "./components/AtlasHydrawiseWeatherLink";
import AtlasPhotoPastePolish from "./components/AtlasPhotoPastePolish";
import AtlasDayOffControl from "./components/AtlasDayOffControl";
import AtlasSharedTeamList from "./components/AtlasSharedTeamList";
import AtlasVendorScrollbarPolish from "./components/AtlasVendorScrollbarPolish";
import AtlasVendorContactsPersistence from "./components/AtlasVendorContactsPersistence";
import AtlasVendorContactsMaintainXPolish from "./components/AtlasVendorContactsMaintainXPolish";
import AtlasVendorSectionCleanup from "./components/AtlasVendorSectionCleanup";
import AtlasWorkCompletionSpeed from "./components/AtlasWorkCompletionSpeed";
import AtlasWorkScheduleRepair from "./components/AtlasWorkScheduleRepair";
import AtlasTeamPeoplePolish from "./components/AtlasTeamPeoplePolish";
import AtlasTeamWorkActions from "./components/AtlasTeamWorkActions";
import AtlasTeamInviteActions from "./components/AtlasTeamInviteActions";
import AtlasTeamHeaderCleanup from "./components/AtlasTeamHeaderCleanup";
import AtlasHouseMaintenancePolish from "./components/AtlasHouseMaintenancePolish";
import AtlasNavigationSafety from "./components/AtlasNavigationSafety";
import AtlasOperationsPolish from "./components/AtlasOperationsPolish";
import AtlasOwnerReportHeaderPolish from "./components/AtlasOwnerReportHeaderPolish";
import AtlasServiceLinkPolish from "./components/AtlasServiceLinkPolish";
import AtlasWorkHistorySearch from "./components/AtlasWorkHistorySearch";
import AtlasSidebarScrollbarPolish from "./components/AtlasSidebarScrollbarPolish";
import AtlasGraduationPartyCleanup from "./components/AtlasGraduationPartyCleanup";
import AtlasAskAtlasFreeLabels from "./components/AtlasAskAtlasFreeLabels";
import AtlasGeneratedWorkCommentsCleanup from "./components/AtlasGeneratedWorkCommentsCleanup";
import AtlasDropdownDismissBehavior from "./components/AtlasDropdownDismissBehavior";
import AtlasScrollSafety from "./components/AtlasScrollSafety";

export const metadata: Metadata = {
  title: "Atlas",
  description: "Atlas Estate Systems for 2000.",
  applicationName: "Atlas",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Atlas",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/atlas-logo.png",
    shortcut: "/atlas-logo.png",
    apple: "/atlas-logo.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0B1E33",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/atlas-logo.png" type="image/png" />
        <link rel="shortcut icon" href="/atlas-logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/atlas-logo.png" />
      </head>

      <body>
        <AtlasGraduationPartyCleanup />
        <AtlasSidebarScrollbarPolish />
        <AtlasAskAtlasFreeLabels />
        <AtlasGeneratedWorkCommentsCleanup />
        <AtlasDropdownDismissBehavior />
        <AtlasVendorContactsPersistence />
        <AtlasLocationsPolish />
        <AtlasLocationsAssetStyle />
        <AtlasLocationSectionTabs />
        <AtlasLocationsViewportPolish />
        <AtlasLocationDetailPolish />
        <AtlasLocationPhotoEditor />
        <AtlasLocationMainPhotoControl />
        <AtlasPropertyVisibility />
        <AtlasWorkspacePolish />
        <AtlasKnowledgePolish />
        <AtlasAssetReferencePolish />
        <AtlasAssetAdditionalInfo />
        <AtlasAssetEditVisibilityFix />
        <AtlasAssetsViewportPolish />
        <AtlasDepartmentAssetPhotoPolish />
        <AtlasWorkPolish />
        <AtlasWorkCategoryCanonicalizer />
        <AtlasWorkEditorCleanup />
        <AtlasWorkWeekWrap />
        <AtlasDashboardNoteActionsPolish />
        <AtlasDashboardUpcomingWork />
        <AtlasDashboardDefaultUpcoming />
        <AtlasHydrawiseWeatherLink />
        <AtlasPhotoPastePolish />
        <AtlasDayOffControl />
        <AtlasSharedTeamList />
        <AtlasVendorScrollbarPolish />
        <AtlasVendorContactsMaintainXPolish />
        <AtlasVendorSectionCleanup />
        <AtlasWorkCompletionSpeed />
        <AtlasWorkScheduleRepair />
        <AtlasTeamPeoplePolish />
        <AtlasTeamWorkActions />
        <AtlasTeamInviteActions />
        <AtlasTeamHeaderCleanup />
        <AtlasHouseMaintenancePolish />
        <AtlasNavigationSafety />
        <AtlasOperationsPolish />
        <AtlasOwnerReportHeaderPolish />
        <AtlasServiceLinkPolish />
        <AtlasWorkHistorySearch />
        <AtlasScrollSafety />
        {children}
      </body>
    </html>
  );
}
