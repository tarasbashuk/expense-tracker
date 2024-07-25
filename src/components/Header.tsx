import { SignedIn, SignedOut, UserButton, SignInButton } from '@clerk/nextjs';

const Header = async () => {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <h2>Expense Tracker</h2>
        <div>
          <SignedOut>
            <SignInButton />
          </SignedOut>

          <SignedIn>
            <UserButton showName />
          </SignedIn>
        </div>
      </div>
    </nav>
  );
};

export default Header;
