import { cn } from "@/lib/utils";

export default function DefaultLayout({ className, children, ...props }) {
  return (
    <section
      className={cn(
        `flex relative w-full mx-auto px-6 sm:px-8 md:px-20 lg:px-24 xl:px-28 2xl:px-36 font-jakarta-regular bg-white`,
        className
      )}
      {...props}
    >
      <div className="relative max-w-7xl w-full mx-auto py-2 lg:py-4">
        <div className="py-2 px-4">{children}</div>
      </div>
    </section>
  );
}
