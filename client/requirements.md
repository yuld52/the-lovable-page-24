## Packages
recharts | For the dashboard sales charts
lucide-react | For all icons (Sidebar, Dashboard, Actions)
date-fns | For date formatting and manipulation
clsx | For conditional class names (usually installed but good to ensure)
tailwind-merge | For merging tailwind classes

## Notes
Tailwind Config - extend fontFamily:
fontFamily: {
  sans: ["Inter", "sans-serif"],
  display: ["Inter", "sans-serif"],
}
API Integration:
- Hooks should use api.X.path from @shared/routes
- Authentication is currently mock UI (login page -> dashboard)
- Dark mode is default
