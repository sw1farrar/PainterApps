/** Shared stacking order for portaled UI — higher layers render above lower ones. */
export const Z_LAYERS = {
  drawerOverlay: "z-[100]",
  drawerContent: "z-[101]",
  dialogOverlay: "z-[110]",
  dialogContent: "z-[111]",
  nestedDialogOverlay: "z-[112]",
  nestedDialogContent: "z-[113]",
  popover: "z-[120]",
} as const;