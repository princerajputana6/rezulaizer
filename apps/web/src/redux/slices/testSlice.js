import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  tests: [],
  currentTest: null,
  currentAttempt: null,
  testResults: null,
  isLoading: false,
  error: null,
  filters: {
    type: 'all',
    status: 'all',
    search: '',
  },
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  },
};

const testSlice = createSlice({
  name: 'test',
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    clearError: (state) => {
      state.error = null;
    },
    setTests: (state, action) => {
      state.tests = action.payload.tests;
      state.pagination = action.payload.pagination;
      state.isLoading = false;
    },
    addTest: (state, action) => {
      state.tests.unshift(action.payload);
    },
    updateTest: (state, action) => {
      const index = state.tests.findIndex(test => test.id === action.payload.id);
      if (index !== -1) {
        state.tests[index] = action.payload;
      }
    },
    deleteTest: (state, action) => {
      state.tests = state.tests.filter(test => test.id !== action.payload);
    },
    setCurrentTest: (state, action) => {
      state.currentTest = action.payload;
    },
    setCurrentAttempt: (state, action) => {
      state.currentAttempt = action.payload;
    },
    updateAttemptAnswer: (state, action) => {
      if (state.currentAttempt) {
        const { questionId, answer } = action.payload;
        const existingAnswerIndex = state.currentAttempt.answers.findIndex(
          a => a.questionId === questionId
        );
        
        if (existingAnswerIndex !== -1) {
          state.currentAttempt.answers[existingAnswerIndex].answer = answer;
        } else {
          state.currentAttempt.answers.push({ questionId, answer });
        }
      }
    },
    setTestResults: (state, action) => {
      state.testResults = action.payload;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setPagination: (state, action) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    resetTest: (state) => {
      state.currentTest = null;
      state.currentAttempt = null;
      state.testResults = null;
      state.error = null;
    },
  },
});

export const {
  setLoading,
  setError,
  clearError,
  setTests,
  addTest,
  updateTest,
  deleteTest,
  setCurrentTest,
  setCurrentAttempt,
  updateAttemptAnswer,
  setTestResults,
  setFilters,
  setPagination,
  resetTest,
} = testSlice.actions;

export const selectTests = (state) => state.test.tests;
export const selectCurrentTest = (state) => state.test.currentTest;
export const selectCurrentAttempt = (state) => state.test.currentAttempt;
export const selectTestResults = (state) => state.test.testResults;
export const selectTestLoading = (state) => state.test.isLoading;
export const selectTestError = (state) => state.test.error;
export const selectTestFilters = (state) => state.test.filters;
export const selectTestPagination = (state) => state.test.pagination;

export default testSlice.reducer;
