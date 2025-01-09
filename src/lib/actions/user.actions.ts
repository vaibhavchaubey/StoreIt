'use server';

import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '../appwrite/config';
import { ID, Query } from 'node-appwrite';
import { avatarPlaceholderUrl } from '@/constants';
import { parseStringify } from '../utils';

/* **Create account flow**

1. User enters full name and email
2. Check if the user already exist using the email (we will use this to identify if we still need to create a user document or not)
3. Send OTP to user's email
4. This will send a secret key for creating a session. The screat key or OTP will be sent to the user's account email. If the users's auth account has not been created, it will create one.
5. Create a new user document if the user is a new user.
6. Return the user's accountld that will be used to complete the login process later with the OTP.
7. Verify OTP and authenticate to login */

const getUserByEmail = async (email: string) => {
  const { databases } = await createAdminClient();

  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.usersCollectionId,
    [Query.equal('email', [email])]
  );

  return result.total > 0 ? result.documents[0] : null;
};

const handleError = (error: unknown, message: string) => {
  console.log(error, message);
  throw error;
};

const sendEmailOTP = async ({ email }: { email: string }) => {
  const { account } = await createAdminClient();

  try {
    const session = await account.createEmailToken(ID.unique(), email);

    return session.userId;
  } catch (error) {
    handleError(error, 'Failed to send email OTP');
  }
};

export const createAccount = async ({
  fullName,
  email,
}: {
  fullName: string;
  email: string;
}) => {
  const existingUser = await getUserByEmail(email);

  const accountId = await sendEmailOTP({ email });
  if (!accountId) {
    throw new Error('Failed to send OTP');
  }

  if (!existingUser) {
    const { databases } = await createAdminClient();

    await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      ID.unique(),
      {
        fullName,
        email,
        emailVerified: false,
        avatar: avatarPlaceholderUrl,
        accountId,
      }
    );
  }

  return parseStringify({ accountId });
};
