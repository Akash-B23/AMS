import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/layout/AuthLayout";
import Button from "../components/ui/Button";

export default function UnauthorizedPage() {
  const { user, homePathForRole } = useAuth();

  return (
    <AuthLayout
      title="Access denied"
      subtitle={
        user
          ? `Your role (${user.role}) cannot view this page.`
          : "You do not have permission to view this page."
      }
    >
      {user && (
        <Link to={homePathForRole(user.role, user.societySlug)} className="block">
          <Button className="w-full">Go to your dashboard</Button>
        </Link>
      )}
    </AuthLayout>
  );
}
