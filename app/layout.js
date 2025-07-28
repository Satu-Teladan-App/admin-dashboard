import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

export const metadata = {
  title: "Satu Teladan Admin Dashboard",
  description:
    "Dashboard administrasi untuk mengelola alumni, komunitas, kegiatan, berita, pendanaan, dan pesan di Satu Teladan.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className={`antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
