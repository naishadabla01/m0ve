import { supabase } from '@/lib/supabase';
import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, SafeAreaView, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function SignUp() {
  const router = useRouter();
  const [first, setFirst] = useState('');
  const [last,  setLast]  = useState('');
  const [email, setEmail] = useState('');
  const [pass,  setPass]  = useState('');
  const [phone, setPhone] = useState('');
  const [busy,  setBusy]  = useState(false);

  async function onSignUp() {
    if (!first || !last || !email || !pass || !phone) {
      Alert.alert('Sign up', 'Fill all fields');
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password: pass });
      if (error) throw error;

      const uid = data.user?.id;
      if (uid) {
        const { error: upErr } = await supabase
          .from('profiles')
          .upsert({ user_id: uid, role: 'user', first_name: first, last_name: last, phone });
        if (upErr) throw upErr;
      }

      Alert.alert('Account created', 'Please sign in.');
      router.replace('/signin');
    } catch (e: any) {
      Alert.alert('Sign up failed', e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:'black' }}>
      <View style={{ padding:20 }}>
        <Text style={{ color:'white', fontSize:28, fontWeight:'700', marginBottom:16 }}>Sign up</Text>

        <View style={{ flexDirection:'row', gap:12 }}>
          <TextInput placeholder="First name" placeholderTextColor="#6b7280" value={first} onChangeText={setFirst}
            style={{ flex:1, backgroundColor:'#111827', color:'white', borderRadius:12, padding:14, borderWidth:1, borderColor:'#27272a', marginBottom:12 }} />
          <TextInput placeholder="Last name" placeholderTextColor="#6b7280" value={last} onChangeText={setLast}
            style={{ flex:1, backgroundColor:'#111827', color:'white', borderRadius:12, padding:14, borderWidth:1, borderColor:'#27272a', marginBottom:12 }} />
        </View>

        <TextInput placeholder="Email" placeholderTextColor="#6b7280" value={email} onChangeText={setEmail}
          keyboardType="email-address" autoCapitalize="none"
          style={{ backgroundColor:'#111827', color:'white', borderRadius:12, padding:14, borderWidth:1, borderColor:'#27272a', marginBottom:12 }} />

        <TextInput placeholder="Password" placeholderTextColor="#6b7280" value={pass} onChangeText={setPass}
          secureTextEntry style={{ backgroundColor:'#111827', color:'white', borderRadius:12, padding:14, borderWidth:1, borderColor:'#27272a', marginBottom:12 }} />

        <TextInput placeholder="Phone" placeholderTextColor="#6b7280" value={phone} onChangeText={setPhone}
          keyboardType="phone-pad" style={{ backgroundColor:'#111827', color:'white', borderRadius:12, padding:14, borderWidth:1, borderColor:'#27272a' }} />

        <TouchableOpacity disabled={busy} onPress={onSignUp}
          style={{ marginTop:16, backgroundColor:'#10b981', borderRadius:12, padding:14, alignItems:'center' }}>
          <Text style={{ color:'black', fontWeight:'700' }}>{busy ? 'Creating…' : 'Create account'}</Text>
        </TouchableOpacity>

        <Text style={{ color:'#9ca3af', marginTop:16 }}>
          Already have an account? <Link href="/signin" style={{ color:'#10b981' }}>Sign in</Link>
        </Text>
      </View>
    </SafeAreaView>
  );
}
