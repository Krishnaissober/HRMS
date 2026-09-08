"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbProps extends React.HTMLAttributes<HTMLElement> {
  /**
   * If true, the breadcrumb will be rendered as a nav element
   * @default true
   */
  nav?: boolean;
}

const Breadcrumb = React.forwardRef<HTMLElement, BreadcrumbProps>(
  ({ className, nav = true, children, ...props }, ref) => {
    return nav ? (
      <nav
        ref={ref}
        className={cn("flex flex-wrap items-center gap-1.5 text-sm", className)}
        aria-label="Breadcrumb"
        {...props}
      >
        {children}
      </nav>
    ) : (
      <ol className={cn("flex flex-wrap items-center gap-1.5 text-sm", className)} {...props}>
        {children}
      </ol>
    );
  },
);
Breadcrumb.displayName = "Breadcrumb";

const BreadcrumbList = React.forwardRef<HTMLOListElement, React.HTMLAttributes<HTMLOListElement>>(
  ({ className, children, ...props }, ref) => (
    <ol ref={ref} className={cn("flex flex-wrap items-center gap-1.5", className)} {...props}>
      {children}
    </ol>
  ),
);
BreadcrumbList.displayName = "BreadcrumbList";

const BreadcrumbItem = React.forwardRef<HTMLLIElement, React.HTMLAttributes<HTMLLIElement>>(
  ({ className, children, ...props }, ref) => (
    <li ref={ref} className={cn("", className)} {...props}>
      {children}
    </li>
  ),
);
BreadcrumbItem.displayName = "BreadcrumbItem";

interface BreadcrumbLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  asChild?: boolean;
}

const BreadcrumbLink = React.forwardRef<HTMLAnchorElement, BreadcrumbLinkProps>(
  ({ className, asChild, children, href, ...props }, ref) => {
    if (asChild) return <>{children}</>;
    return (
      <a
        ref={ref}
        href={href}
        className={cn("transition-colors hover:text-foreground", className)}
        {...props}
      >
        {children}
      </a>
    );
  },
);
BreadcrumbLink.displayName = "BreadcrumbLink";

const BreadcrumbPage = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, children, ...props }, ref) => (
    <span
      ref={ref}
      className={cn("font-normal text-muted-foreground", className)}
      aria-current="page"
      {...props}
    >
      {children}
    </span>
  ),
);
BreadcrumbPage.displayName = "BreadcrumbPage";

const BreadcrumbSeparator = React.forwardRef<HTMLLIElement, React.HTMLAttributes<HTMLLIElement>>(
  ({ className, ...props }, ref) => (
    <li
      ref={ref}
      className={cn("flex items-center text-muted-foreground", className)}
      aria-hidden="true"
      {...props}
    >
      <ChevronRight className="h-3.5 w-3.5" />
      <span className="sr-only">/</span>
    </li>
  ),
);
BreadcrumbSeparator.displayName = "BreadcrumbSeparator";

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
};
