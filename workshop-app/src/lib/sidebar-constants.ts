/**
 * Single source of truth for app sidebar dimensions.
 * Used by dashboard (AppSidebar), document (DocumentSidebar), and ui/sidebar.
 * Update here to change sidebar width across all contexts.
 */
export const SIDEBAR_WIDTH_EXPANDED_PX = 360;
export const SIDEBAR_WIDTH_COLLAPSED_PX = 48;

/** Tailwind class for expanded sidebar (use in className) */
export const SIDEBAR_WIDTH_EXPANDED_CLASS = "w-[360px]";
/** Tailwind class for collapsed icon rail (48px) */
export const SIDEBAR_WIDTH_COLLAPSED_CLASS = "w-12";
