import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../api/client";
import AuthLayout, { AuthFooterLink, AuthFooterText } from "../components/layout/AuthLayout";
import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import FormField from "../components/ui/FormField";
import Input from "../components/ui/Input";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { societySlug } = useParams();
  const { login, homePathForRole } = useAuth();
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
      const loggedIn = await login(societySlug, email, password);
      navigate(
        homePathForRole(loggedIn.role, societySlug, loggedIn.setupComplete),
        { replace: true },
      );
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

  const societyLabel = societySlug
    ? societySlug.replace(/-/g, " ")
    : "your society";

  return (
    <AuthLayout
      title="Sign in"
      subtitle={`Access ${societyLabel} on AMS`}
      footer={
        <>
          <AuthFooterText>Dev: resident@ams.local / password123</AuthFooterText>
          <p>
            <AuthFooterLink to="/platform/login">Platform admin</AuthFooterLink>
            {" · "}
            <AuthFooterLink to="/signup">Create your society</AuthFooterLink>
          </p>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="Email" htmlFor="email">
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </FormField>
        <FormField label="Password" htmlFor="password">
          <Input
            id="password"
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
