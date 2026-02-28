/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email for ExpiredHawk</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://zzigibfdsitbvczozlsg.supabase.co/storage/v1/object/public/email-assets/logo.png"
          width="40"
          height="40"
          alt="ExpiredHawk"
          style={logo}
        />
        <Heading style={h1}>Welcome to ExpiredHawk</Heading>
        <Text style={text}>
          Thanks for creating your account! You're one step away from monitoring
          expiring domains with smart pattern matching.
        </Text>
        <Text style={text}>
          Please confirm your email address (
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
          ) to get started:
        </Text>
        <Button style={button} href={confirmationUrl}>
          Verify Email
        </Button>
        <Text style={footer}>
          If you didn't create an account on ExpiredHawk, you can safely ignore
          this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, system-ui, sans-serif' }
const container = { padding: '20px 25px' }
const logo = { borderRadius: '10px', marginBottom: '20px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#0d2818',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#5c6b63',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const link = { color: '#0f9d6e', textDecoration: 'underline' }
const button = {
  backgroundColor: '#0f9d6e',
  color: '#ffffff',
  fontSize: '14px',
  borderRadius: '12px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
