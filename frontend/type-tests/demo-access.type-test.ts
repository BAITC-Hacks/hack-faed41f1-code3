import {
  canAccessDemoRoute,
  fallbackPathForDemoRole,
  isDemoRole,
  type DemoRole,
} from "@/lib/demo-access"

const roles: DemoRole[] = ["employee", "hr"]
const employeeCannotOpenHr = canAccessDemoRoute("employee", "/hr-dashboard")
const employeeCannotImport = canAccessDemoRoute("employee", "/import")
const employeeCanOpenProfile = canAccessDemoRoute("employee", "/profile")
const hrCanOpenDashboard = canAccessDemoRoute("hr", "/hr-dashboard")
const employeeFallback: "/profile" | "/hr-dashboard" = fallbackPathForDemoRole("employee")
const parsedRole: boolean = isDemoRole("employee")

// @ts-expect-error Only employee and hr are valid demo roles.
const invalidRole: DemoRole = "admin"

void roles
void employeeCannotOpenHr
void employeeCannotImport
void employeeCanOpenProfile
void hrCanOpenDashboard
void employeeFallback
void parsedRole
void invalidRole
