import * as TabsPrimitive from "@radix-ui/react-tabs"
import * as React from "react"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, style, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    style={{
      borderColor: "var(--color-tabs-border)",
      backgroundColor: "var(--color-card)",
      color: "var(--color-card-foreground)",
      ...style,
    }}
    className={cn(
      "inline-flex h-11 items-center justify-center rounded-lg bg-card p-1 text-card-foreground shadow-none",
      "border border-tabs",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium ring-offset-background",
      "transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "disabled:pointer-events-none disabled:opacity-50",
      "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
      "data-[state=active]:shadow-lg data-[state=active]:shadow-primary/30",
      "hover:text-foreground hover:bg-accent/50",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, style, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    style={{
      borderColor: "var(--color-tabs-border)",
      backgroundColor: "var(--color-card)",
      color: "var(--color-card-foreground)",
      ...style,
    }}
    className={cn(
      "mt-4 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "rounded-lg border border-tabs bg-card p-6 shadow-none",
      "animate-in fade-in-50 duration-300",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsContent, TabsList, TabsTrigger }
