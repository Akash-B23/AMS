import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import AuthLayout, { AuthFooterLink, AuthFooterText } from "../components/layout/AuthLayout";
import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import FormField from "../components/ui/FormField";
import Input from "../components/ui/Input";
import { useAuth } from "../context/AuthContext";

export default function PlatformLoginPage() {
  const { platformLogin, homePathForRole } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const loggedIn = await platformLogin(email, password);
      navigate(homePathForRole(loggedIn.role), { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Platform admin"
      subtitle="Sign in as platform superadmin"
      footer={
        <>
          <AuthFooterText>Dev: superadmin@ams.local / password123</AuthFooterText>
          <p>
            <AuthFooterLink to="/greenview-apartments/login">Society login</AuthFooterLink>
          </p>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="Email" htmlFor="platform-email">
          <Input
            id="platform-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </FormField>
        <FormField label="Password" htmlFor="platform-password">
          <Input
            id="platform-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </FormField>
        {error && <Alert variant="error">{error}</Alert>}
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </AuthLayout>
  );
}
