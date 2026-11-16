import { useState, useEffect } from "react";
import { Route, Switch } from "wouter";
import Cinema from "./cinema/Cinema";
import AdminPage from "./pages/Admin";
import AdminLogin from "./pages/AdminLogin";
import { authService } from "./cinema/authService";

function ProtectedAdmin() {
  const [authed, setAuthed] = useState<boolean>(() => authService.isAuthenticated());

  useEffect(() => {
    return authService.onAuthChange((status) => {
      setAuthed(status);
    });
  }, []);

  if (!authed) {
    return <AdminLogin onSuccess={() => setAuthed(true)} />;
  }

  return <AdminPage onLogout={() => authService.logout()} />;
}

export default function App() {
  return (
    <Switch>
      <Route path="/admin" component={ProtectedAdmin} />
      <Route component={Cinema} />
    </Switch>
  );
}
