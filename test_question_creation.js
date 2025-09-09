#!/usr/bin/env node

// Test script to reproduce the question creation issue
// This will help us understand if the API server is running and responding correctly

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:8084/api';

async function testQuestionCreation() {
  console.log('🧪 Testing question creation...');
  
  // First, test if the API server is running
  console.log('\n1. Testing API server health...');
  try {
    const healthResponse = await fetch('http://localhost:8084/health');
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ API server is running:', healthData);
    } else {
      console.log('❌ API server health check failed:', healthResponse.status);
      return;
    }
  } catch (error) {
    console.log('❌ Cannot connect to API server:', error.message);
    console.log('💡 Make sure to start the API server with: npm run dev:api');
    return;
  }

  // Test creating a question
  console.log('\n2. Testing question creation...');
  const testQuestion = {
    questionText: 'Test question from script - what is the capital of France?',
    answerText: 'Paris is the capital of France.',
    sources: [],
    tagIds: []
  };

  try {
    const response = await fetch(`${API_BASE}/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testQuestion)
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers));

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Question created successfully:', result);
    } else {
      const error = await response.text();
      console.log('❌ Question creation failed:', error);
    }
  } catch (error) {
    console.log('❌ Network error during question creation:', error.message);
  }

  // Test fetching questions
  console.log('\n3. Testing question retrieval...');
  try {
    const response = await fetch(`${API_BASE}/questions`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Retrieved questions:', {
        count: data.questions.length,
        pagination: data.pagination
      });
      
      if (data.questions.length > 0) {
        console.log('Latest question:', data.questions[0]);
      }
    } else {
      console.log('❌ Failed to retrieve questions:', response.status);
    }
  } catch (error) {
    console.log('❌ Network error during question retrieval:', error.message);
  }
}

testQuestionCreation().catch(console.error);