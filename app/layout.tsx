import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";


export const metadata: Metadata = {
    title: "Finance App",
    description: "Personal finance tracker",
};


export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {

    return (
        <html lang="en">

            <body>

                <div className="
                    flex
                    min-h-screen
                ">

                    <Sidebar />


                    <main className="
                        flex-1
                        p-8
                    ">

                        {children}

                    </main>

                </div>


            </body>

        </html>
    );
}