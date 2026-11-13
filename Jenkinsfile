pipeline {
  agent any
  environment {
    PATH  = "/opt/homebrew/bin:/usr/local/bin:/Applications/Docker.app/Contents/Resources/bin:${env.PATH}"
    IMAGE = "jananisoma/healthcare-app"
    TAG   = "${BUILD_NUMBER}"
  }
  stages {
    stage('Checkout') { steps { checkout scm } }

    stage('Secret Scan (Gitleaks)') {
      steps { sh 'gitleaks detect --source . --no-git' }
    }

    stage('Dependency Scan (npm audit)') {
      steps { sh 'npm audit --audit-level=high' }
    }

    stage('Dockerfile Lint (Hadolint)') {
      steps { sh 'hadolint --failure-threshold error Dockerfile' }
    }

    stage('Build Image') { steps { sh 'docker build -t $IMAGE:$TAG .' } }

    stage('Image Scan (Trivy)') {
      steps {
        sh 'trivy image --format table -o trivy-report.txt $IMAGE:$TAG'
        archiveArtifacts artifacts: 'trivy-report.txt'
        sh 'trivy image --exit-code 1 --severity CRITICAL --ignore-unfixed $IMAGE:$TAG'
      }
    }

    stage('Push Image') {
      steps {
        withCredentials([usernamePassword(credentialsId: 'dockerhub-creds',
            usernameVariable: 'U', passwordVariable: 'P')]) {
          sh 'echo $P | docker login -u $U --password-stdin && docker push $IMAGE:$TAG'
        }
      }
    }

    stage('Deploy to K8s') {
      steps {
        sh '''
          kubectl create namespace healthcare --dry-run=client -o yaml | kubectl apply -f -
          sed -i.bak "s|image:.*|image: $IMAGE:$TAG|" k8s/deployment.yaml
          kubectl apply -f k8s/
          kubectl rollout status deployment/healthcare-app -n healthcare
        '''
      }
    }

    stage('DAST (OWASP ZAP baseline)') {
      steps {
        sh '''
          kubectl port-forward --address 0.0.0.0 -n healthcare svc/healthcare-svc 8090:80 > /dev/null 2>&1 &
          PF=$!
          sleep 5
          chmod a+w .
          docker run --rm -v "$(pwd)":/zap/wrk ghcr.io/zaproxy/zaproxy:stable \
            zap-baseline.py -t http://host.docker.internal:8090 -r zap-report.html || true
          kill $PF || true
        '''
        archiveArtifacts artifacts: 'zap-report.html', allowEmptyArchive: true
      }
    }
  }
}
