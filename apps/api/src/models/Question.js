const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  test: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Test',
    index: true
  },
  questionText: {
    type: String,
    required: [true, 'Question text is required'],
    trim: true
  },
  questionType: {
    type: String,
    enum: ['multiple_choice', 'true_false', 'short_answer', 'coding', 'essay'],
    default: 'multiple_choice'
  },
  options: [{
    text: String,
    isCorrect: Boolean
  }],
  correctAnswer: String,
  points: {
    type: Number,
    default: 10,
    min: 1
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  category: {
    type: String,
    enum: ['technical', 'aptitude', 'behavioral', 'coding', 'general'],
    default: 'technical'
  },
  tags: [String],
  explanation: String,
  timeLimit: Number, // seconds
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

questionSchema.index({ company: 1, category: 1 });
questionSchema.index({ test: 1 });

module.exports = mongoose.model('Question', questionSchema);
