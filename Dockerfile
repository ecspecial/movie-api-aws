# Use an official Node.js runtime as the base image
FROM public.ecr.aws/lambda/nodejs:18

# Set the working directory inside the container
COPY . ${LAMBDA_TASK_ROOT}/

# Install project dependencies
RUN npm install

# Start the application
CMD [ "index.handler" ]