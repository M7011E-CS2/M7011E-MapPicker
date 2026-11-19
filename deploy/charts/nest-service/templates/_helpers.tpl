{{/* Name of every resource = the Helm release name, e.g. "user-service". */}}
{{- define "nest-service.fullname" -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/* Labels used by the Service to find the pods. Never change these after the first deploy. */}}
{{- define "nest-service.selectorLabels" -}}
app.kubernetes.io/name: {{ include "nest-service.fullname" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{/* All labels = selector labels + descriptive metadata. */}}
{{- define "nest-service.labels" -}}
{{ include "nest-service.selectorLabels" . }}
app.kubernetes.io/part-of: mappick
app.kubernetes.io/version: {{ .Values.image.tag | trunc 63 | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version }}
{{- end -}}
