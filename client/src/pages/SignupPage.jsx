import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import AuthLayout, { AuthFooterLink } from "../components/layout/AuthLayout";
import Alert from "../components/ui/Alert";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import FormField from "../components/ui/FormField";
import Input from "../components/ui/Input";
import * as onboardingApi from "../api/onboarding";
import { useAuth } from "../context/AuthContext";
import { slugify } from "../utils/onboarding";

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [societyName, setSocietyName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [slugStatus, setSlugStatus] = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!slugEdited && societyName) {
      setSlug(slugify(societyName));
    }
  }, [societyName, slugEdited]);

  useEffect(() => {
    if (!slug || slug.length < 3) {
      setSlugStatus(null);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const result = await onboardingApi.checkSlug(slug);
        setSlugStatus(result);
      } catch {
        setSlugStatus({ available: false, reason: "Could not check slug" });
      }
    }, 400);

    return () => clearTimeout(debounceRef.current);
  }, [slug]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await signup({
        societyName,
        slug,
        adminEmail,
        adminPassword,
        adminName: adminName || undefined,
      });
      navigate(`/${user.societySlug}/setup`, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Signup failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Create your society"
      subtitle="Register your apartment or housing society on AMS."
      footer={
        <p>
          Already have an account?{" "}
          <AuthFooterLink to="/greenview-apartments/login">Sign in</AuthFooterLink>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="Society name" htmlFor="society-name">
          <Input
            id="society-name"
            type="text"
            value={societyName}
            onChange={(e) => setSocietyName(e.target.value)}
            required
            maxLength={200}
          />
        </FormField>
        <FormField
          label="URL slug"
          htmlFor="slug"
          hint="Used in your society login link, e.g. /greenview-apartments"
        >
          <Input
            id="slug"
            type="text"
            value={slug}
            onChange={(e) => {
              setSlugEdited(true);
              setSlug(e.target.value.toLowerCase());
            }}
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            title="Lowercase letters, numbers, and hyphens only"
          />
          {slug.length >= 3 && slugStatus && (
            <Badge variant={slugStatus.available ? "owner" : "warning"}>
              {slugStatus.available
                ? "Slug available"
                : slugStatus.reason ?? "Slug not available"}
            </Badge>
          )}
        </FormField>
        <FormField label="Your name" htmlFor="admin-name">
          <Input
            id="admin-name"
            type="text"
            value={adminName}
            onChange={(e) => setAdminName(e.target.value)}
            maxLength={200}
          />
        </FormField>
        <FormField label="Admin email" htmlFor="admin-email">
          <Input
            id="admin-email"
            type="email"
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </FormField>
        <FormField label="Password" htmlFor="admin-password" hint="At least 8 characters">
          <Input
            id="admin-password"
            type="password"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </FormField>
        {error && <Alert variant="error">{error}</Alert>}
        <Button
          type="submit"
          disabled={submitting || slugStatus?.available === false}
          className="w-full"
        >
          {submitting ? "Creating..." : "Create society"}
        </Button>
      </form>
    </AuthLayout>
  );
}
