import { cn } from "@/lib/utils";

export default function DefaultLayout({ className, children, ...props }) {
  return (
    <section
      className={cn(
        "flex relative w-full bg-white pl-[10px] pr-[100px]", // padding kiri 10px, kanan 100px
        className
      )}
      {...props}
    >
      <div className="w-full">{children}</div>
    </section>
  );
}

// const [isAuthenticated, setIsAuthenticated] = useState(false);
// const [loading, setLoading] = useState(true);
// const supabase = createClient();

// useEffect(() => {
//   const checkAuth = async () => {
//     try {
//       const {
//         data: { user },
//       } = await supabase.auth.getUser();

//       if (user) {
//         // Check if user has admin role
//         let adminRoles = null;
//         try {
//           const { data } = await supabase
//             .from("admin_roles")
//             .select("*")
//             .eq("user_id", user.id);
//           adminRoles = data;
//         } catch (queryError) {
//           console.error("Admin role query error:", queryError);
//         }

//         setIsAuthenticated(adminRoles && adminRoles.length > 0);
//       } else {
//         setIsAuthenticated(false);
//       }
//     } catch (error) {
//       console.error("Auth check error:", error);
//       setIsAuthenticated(false);
//     } finally {
//       setLoading(false);
//     }
//   };

//   checkAuth();

//   // Listen for auth changes
//   const {
//     data: { subscription },
//   } = supabase.auth.onAuthStateChange(async (event, session) => {
//     if (event === "SIGNED_OUT" || !session) {
//       setIsAuthenticated(false);
//     } else if (event === "SIGNED_IN" && session) {
//       const { data: adminRoles } = await supabase
//         .from("admin_roles")
//         .select("*")
//         .eq("user_id", session.user.id);

//       setIsAuthenticated(adminRoles && adminRoles.length > 0);
//     }
//   });

//   return () => subscription.unsubscribe();
// }, [supabase]);

// if (loading) {
//   return (
//     <div className="min-h-screen flex items-center justify-center">
//       <div className="text-lg">Loading...</div>
//     </div>
//   );
// }

// // If not authenticated, render children without sidebar
// if (!isAuthenticated) {
//   return (
//     <>
//       <main className="min-h-screen">{children}</main>
//       <Toaster />
//     </>
//   );
// }

// If authenticated, render with sidebar
