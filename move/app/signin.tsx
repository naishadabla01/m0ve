import { supabase } from '@/lib/supabase';
import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, SafeAreaView, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [pass, setPass]   = useState('');
  const [busy, setBusy]   = useState(false);

  async function onSignIn() {
    if (!email || !pass) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error) throw error;
      router.replace('/home');
    } catch (e: any) {
      Alert.alert('Sign in failed', e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:'black' }}>
      <View style={{ padding:20 }}>
        <Text style={{ color:'white', fontSize:28, fontWeight:'700', marginBottom:16 }}>Sign in</Text>

        <TextInput
          placeholder="Email"
          placeholderTextColor="#6b7280"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          style={{ backgroundColor:'#111827', color:'white', borderRadius:12, padding:14, borderWidth:1, borderColor:'#27272a', marginBottom:12 }}
        />
        <TextInput
          placeholder="Password"
          placeholderTextColor="#6b7280"
          value={pass}
          onChangeText={setPass}
          secureTextEntry
          style={{ backgroundColor:'#111827', color:'white', borderRadius:12, padding:14, borderWidth:1, borderColor:'#27272a' }}
        />

        <TouchableOpacity disabled={busy} onPress={onSignIn}
          style={{ marginTop:16, backgroundColor:'#10b981', borderRadius:12, padding:14, alignItems:'center' }}>
          <Text style={{ color:'black', fontWeight:'700' }}>{busy ? 'Signing in…' : 'Sign in'}</Text>
        </TouchableOpacity>

        <Text style={{ color:'#9ca3af', marginTop:16 }}>
          New here? <Link href="/signup" style={{ color:'#10b981' }}>Create account</Link>
        </Text>
      </View>
    </SafeAreaView>
  );
}
