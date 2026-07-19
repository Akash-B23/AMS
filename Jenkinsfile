pipeline {
    agent any
    environment {
        APP_NAME = "my-simple-app"
    }
    stages {
        stage('checkout') {
            steps {
                echo "Cloning the repo..."
                checkout scm
            }
        }
        stage('build') {
            steps {
                echo "building the application"
                bat 'echo Simulating build step'
            }
        }
        stage('test') {
            steps {
                echo "running tests..."
                bat 'echo Simulating test step'
            }
        }
    }
    post {
        success {
            echo "build successful"
        }
        failure {
            echo "build failed"
        }
    }
}
