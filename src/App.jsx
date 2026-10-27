import './App.css'
import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"
import { AuthProvider } from "@/context/AuthContext"
import { ThemeProvider } from "next-themes"

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <Pages />
        <Toaster />
        <SonnerToaster richColors position="top-right" />
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
