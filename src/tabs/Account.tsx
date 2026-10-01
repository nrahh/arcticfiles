import {
    SignedIn,
    SignedOut,
    SignInButton,
    SignUpButton,
    UserButton
} from '@clerk/clerk-react'

export default function Account() {
    return (
        <div className="w-full h-full flex items-center justify-center text-white flex-col">
            <SignedOut>
                <SignInButton />
                <SignUpButton />
            </SignedOut>

            <SignedIn>
                <UserButton />
            </SignedIn>
        </div>
    )
}