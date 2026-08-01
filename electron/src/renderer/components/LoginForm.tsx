import { useState } from "react";
import { useServerHealth } from "../hooks/useServerHealth";
import { authService } from "../services";
import { Icons } from "./Icons";
import ServerStatusIndicator from "./ServerStatusIndicator";

interface LoginFormProps {
  onLogin: (
    accessToken: string,
    refreshToken: string,
    userId: number,
    email: string,
  ) => void;
}

type FormMode = "login" | "register";
type OrgMode = "create" | "join";

function LoginForm({ onLogin }: LoginFormProps) {
  const [mode, setMode] = useState<FormMode>("login");

  // Login form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Register form state
  const [registerData, setRegisterData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    first_name: "",
    last_name: "",
  });
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Organization state for registration
  const [orgMode, setOrgMode] = useState<OrgMode>("create");
  const [orgData, setOrgData] = useState({
    organization_name: "",
    invite_code: "",
  });

  // Server health
  const { isOnline } = useServerHealth();

  // Password validation for register
  const passwordValidation = {
    minLength: registerData.password.length >= 8,
    hasUppercase: /[A-Z]/.test(registerData.password),
    hasLowercase: /[a-z]/.test(registerData.password),
    hasNumber: /[0-9]/.test(registerData.password),
    passwordsMatch:
      registerData.password === registerData.confirmPassword &&
      registerData.confirmPassword.length > 0,
  };

  const isPasswordValid =
    passwordValidation.minLength &&
    passwordValidation.hasUppercase &&
    passwordValidation.hasLowercase &&
    passwordValidation.hasNumber;

  // Organization validation
  const isOrgValid =
    orgMode === "create"
      ? orgData.organization_name.trim().length >= 2
      : orgData.invite_code.trim().length >= 6;

  const isRegisterFormValid =
    registerData.email &&
    registerData.first_name &&
    registerData.last_name &&
    isPasswordValid &&
    passwordValidation.passwordsMatch &&
    isOrgValid &&
    acceptTerms &&
    isOnline;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isOnline) {
      setError("Cannot login: Server is offline");
      return;
    }

    setLoading(true);

    try {
      const response = await authService.login(email, password);

      if (response.success) {
        const { access_token, refresh_token, user } = response.data;
        onLogin(access_token, refresh_token, user.id, user.email);
      } else {
        setError(response.error || "Login failed");
      }
    } catch (err: any) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isOnline) {
      setError("Cannot register: Server is offline");
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!isPasswordValid) {
      setError("Password does not meet requirements");
      return;
    }

    if (!isOrgValid) {
      setError(
        orgMode === "create"
          ? "Organization name must be at least 2 characters"
          : "Please enter a valid invite code",
      );
      return;
    }

    if (!acceptTerms) {
      setError("Please accept the terms and conditions");
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, ...data } = registerData;

      // Build registration data with organization info
      const registrationData = {
        ...data,
        create_organization: orgMode === "create",
        organization_name:
          orgMode === "create" ? orgData.organization_name : undefined,
        invite_code: orgMode === "join" ? orgData.invite_code : undefined,
      };

      const response = await authService.register(registrationData);

      if (response.success) {
        const { access_token, refresh_token, user } = response.data;
        onLogin(access_token, refresh_token, user.id, user.email);
      } else {
        setError(response.error || "Registration failed");
      }
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: FormMode) => {
    setMode(newMode);
    setError("");
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setRegisterData({
      email: "",
      password: "",
      confirmPassword: "",
      first_name: "",
      last_name: "",
    });
    setOrgMode("create");
    setOrgData({
      organization_name: "",
      invite_code: "",
    });
    setAcceptTerms(false);
  };

  return (
    <div className="dark relative flex min-h-screen overflow-hidden bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-primary-500/10 to-transparent rounded-full blur-3xl animate-pulse-slow" />
        <div
          className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-accent-500/10 to-transparent rounded-full blur-3xl animate-pulse-slow"
          style={{ animationDelay: "1s" }}
        />
      </div>

      {/* Left Panel - Branding (visible on larger screens) */}
      <div className="hidden lg:flex lg:w-1/2 relative z-10 p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center shadow-glow">
              <Icons.Clock className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">
              Remote Time Tracker
            </span>
          </div>
        </div>

        <div className="space-y-6">
          <h1 className="text-4xl font-bold text-white leading-tight">
            {mode === "login" ? (
              <>
                Track your time,
                <br />
                boost your productivity
              </>
            ) : (
              <>
                Start tracking your
                <br />
                work time today
              </>
            )}
          </h1>
          <p className="text-dark-300 text-lg">
            {mode === "login"
              ? "Monitor your work hours, capture screenshots automatically, and sync seamlessly across all your devices."
              : "Create an account to monitor your productivity, capture screenshots, and sync across all your devices."}
          </p>

          {/* Features */}
          <div className="space-y-4 pt-6">
            {[
              { icon: Icons.Clock, text: "Real-time time tracking" },
              { icon: Icons.Camera, text: "Automatic screenshot capture" },
              { icon: Icons.Sync, text: "Offline mode with sync" },
              { icon: Icons.Chart, text: "Detailed productivity reports" },
            ].map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-dark-800/50 flex items-center justify-center">
                  <feature.icon className="w-4 h-4 text-primary-400" />
                </div>
                <span className="text-dark-200">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-dark-500 text-sm">
          © {new Date().getFullYear()} Remote Time Tracker. All rights reserved.
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 relative z-10">
        <div className="w-full max-w-md animate-scale-in">
          {/* Server Status */}
          <div className="flex justify-end mb-6">
            <ServerStatusIndicator />
          </div>

          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center shadow-glow">
              <Icons.Clock className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white">
              Remote Time Tracker
            </span>
          </div>

          {/* Form Card */}
          <div className="glass-dark p-8 rounded-3xl shadow-2xl border border-dark-700/50">
            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold gradient-text mb-2">
                {mode === "login" ? "Welcome Back" : "Create Account"}
              </h2>
              <p className="text-dark-400 text-sm">
                {mode === "login"
                  ? "Sign in to start tracking your time"
                  : "Fill in your details to get started"}
              </p>
            </div>

            {/* Server Offline Warning */}
            {!isOnline && (
              <div className="mb-6 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 px-4 py-3 rounded-xl text-sm flex items-start gap-2 animate-slide-down">
                <Icons.Warning className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>
                  Server is offline. Please wait until the connection is
                  restored.
                </span>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm flex items-start gap-2 animate-slide-down">
                <Icons.X className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Login Form */}
            {mode === "login" && (
              <form onSubmit={handleLogin} className="space-y-5">
                {/* Email */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-dark-200">
                    Email Address
                  </label>
                  <div className="relative">
                    <Icons.User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input pl-12"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-dark-200">
                    Password
                  </label>
                  <div className="relative">
                    <Icons.Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input pl-12 pr-12"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200 transition-colors"
                    >
                      {showPassword ? (
                        <Icons.EyeOff className="w-5 h-5" />
                      ) : (
                        <Icons.Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading || !isOnline}
                  className="btn btn-primary w-full text-base py-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Icons.Spinner className="animate-spin h-5 w-5" />
                      Signing in...
                    </span>
                  ) : (
                    "Sign In"
                  )}
                </button>
              </form>
            )}

            {/* Register Form */}
            {mode === "register" && (
              <form onSubmit={handleRegister} className="space-y-4">
                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-dark-200">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={registerData.first_name}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          first_name: e.target.value,
                        })
                      }
                      className="input"
                      placeholder="John"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-dark-200">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={registerData.last_name}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          last_name: e.target.value,
                        })
                      }
                      className="input"
                      placeholder="Doe"
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-dark-200">
                    Email Address
                  </label>
                  <div className="relative">
                    <Icons.User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                    <input
                      type="email"
                      value={registerData.email}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          email: e.target.value,
                        })
                      }
                      className="input pl-12"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-dark-200">
                    Password
                  </label>
                  <div className="relative">
                    <Icons.Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={registerData.password}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          password: e.target.value,
                        })
                      }
                      className="input pl-12 pr-12"
                      placeholder="••••••••"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200 transition-colors"
                    >
                      {showPassword ? (
                        <Icons.EyeOff className="w-5 h-5" />
                      ) : (
                        <Icons.Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  {/* Password Requirements */}
                  {registerData.password && (
                    <div className="mt-2 grid grid-cols-2 gap-1">
                      {[
                        {
                          check: passwordValidation.minLength,
                          text: "8+ characters",
                        },
                        {
                          check: passwordValidation.hasUppercase,
                          text: "Uppercase",
                        },
                        {
                          check: passwordValidation.hasLowercase,
                          text: "Lowercase",
                        },
                        { check: passwordValidation.hasNumber, text: "Number" },
                      ].map((req, index) => (
                        <div
                          key={index}
                          className={`flex items-center gap-1.5 text-xs ${
                            req.check ? "text-green-400" : "text-dark-500"
                          }`}
                        >
                          {req.check ? (
                            <Icons.Check className="w-3 h-3" />
                          ) : (
                            <Icons.X className="w-3 h-3" />
                          )}
                          {req.text}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-dark-200">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Icons.Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={registerData.confirmPassword}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          confirmPassword: e.target.value,
                        })
                      }
                      className={`input pl-12 pr-12 ${
                        registerData.confirmPassword &&
                        !passwordValidation.passwordsMatch
                          ? "border-red-500/50 focus:border-red-500"
                          : ""
                      }`}
                      placeholder="••••••••"
                      required
                    />
                    {registerData.confirmPassword && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        {passwordValidation.passwordsMatch ? (
                          <Icons.Check className="w-5 h-5 text-green-400" />
                        ) : (
                          <Icons.X className="w-5 h-5 text-red-400" />
                        )}
                      </div>
                    )}
                  </div>
                  {registerData.confirmPassword &&
                    !passwordValidation.passwordsMatch && (
                      <p className="text-xs text-red-400">
                        Passwords do not match
                      </p>
                    )}
                </div>

                {/* Organization Section */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Icons.Organization className="w-4 h-4 text-primary-400" />
                    <label className="block text-sm font-medium text-dark-200">
                      Organization
                    </label>
                  </div>

                  {/* Org Mode Toggle */}
                  <div className="grid grid-cols-2 gap-2 p-1 bg-dark-800/50 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setOrgMode("create")}
                      className={`px-3 py-2 text-sm rounded-md transition-all ${
                        orgMode === "create"
                          ? "bg-primary-500/20 text-primary-400 border border-primary-500/30"
                          : "text-dark-400 hover:text-dark-200"
                      }`}
                    >
                      Create New
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrgMode("join")}
                      className={`px-3 py-2 text-sm rounded-md transition-all ${
                        orgMode === "join"
                          ? "bg-primary-500/20 text-primary-400 border border-primary-500/30"
                          : "text-dark-400 hover:text-dark-200"
                      }`}
                    >
                      Join Existing
                    </button>
                  </div>

                  {/* Create Organization */}
                  {orgMode === "create" && (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={orgData.organization_name}
                        onChange={(e) =>
                          setOrgData({
                            ...orgData,
                            organization_name: e.target.value,
                          })
                        }
                        className="input"
                        placeholder="Your Organization Name"
                        required
                        minLength={2}
                      />
                      <p className="text-xs text-dark-500">
                        You will be the owner of this organization
                      </p>
                    </div>
                  )}

                  {/* Join Organization */}
                  {orgMode === "join" && (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={orgData.invite_code}
                        onChange={(e) =>
                          setOrgData({
                            ...orgData,
                            invite_code: e.target.value.toUpperCase(),
                          })
                        }
                        className="input uppercase tracking-wider"
                        placeholder="XXXX-XXXX-XXXX"
                        required
                        minLength={6}
                      />
                      <p className="text-xs text-dark-500">
                        Enter the invite code provided by your organization
                        admin
                      </p>
                    </div>
                  )}
                </div>

                {/* Terms */}
                <div className="flex items-start gap-3 pt-2">
                  <input
                    id="terms"
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-dark-600 bg-dark-800 text-primary-500 focus:ring-primary-500"
                  />
                  <label htmlFor="terms" className="text-sm text-dark-400">
                    I agree to the{" "}
                    <span className="text-primary-400 hover:text-primary-300 cursor-pointer">
                      Terms of Service
                    </span>{" "}
                    and{" "}
                    <span className="text-primary-400 hover:text-primary-300 cursor-pointer">
                      Privacy Policy
                    </span>
                  </label>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading || !isRegisterFormValid}
                  className="btn btn-primary w-full text-base py-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Icons.Spinner className="animate-spin h-5 w-5" />
                      Creating account...
                    </span>
                  ) : (
                    "Create Account"
                  )}
                </button>
              </form>
            )}

            {/* Switch Mode */}
            <div className="mt-6 pt-6 border-t border-dark-800 text-center">
              <p className="text-dark-400 text-sm">
                {mode === "login"
                  ? "Don't have an account? "
                  : "Already have an account? "}
                <button
                  onClick={() =>
                    switchMode(mode === "login" ? "register" : "login")
                  }
                  className="text-primary-400 hover:text-primary-300 font-medium transition-colors"
                >
                  {mode === "login" ? "Create one" : "Sign in"}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginForm;
