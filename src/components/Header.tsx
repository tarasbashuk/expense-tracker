import { SignedIn, SignedOut, UserButton, SignInButton, UserProfile } from '@clerk/nextjs';
import { getOrCreateUser } from '../../lib/userUtils';

const Header = async () => {
  const user = await getOrCreateUser();
  
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <h2>Expense Tracker</h2>
        <div>
          <SignedOut>
            <SignInButton />
          </SignedOut>

          <SignedIn>
            <div className="navbar-user">
            <UserButton />
            {user?.name}
            </div>
          </SignedIn>
        </div>
      </div>
    </nav>
  );
};

export default Header;
