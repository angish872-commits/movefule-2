package com.movefuel.mufil2.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp

enum class MFNavigationIconType { TODAY, FUEL, TRAIN, PROGRESS, CALENDAR, PROFILE, BACK }

@Composable
fun MFNavigationIcon(
    type: MFNavigationIconType,
    tint: Color,
    contentDescription: String,
    modifier: Modifier = Modifier,
) {
    Canvas(modifier.semantics { this.contentDescription = contentDescription }) {
        val w = size.width
        val h = size.height
        val stroke = Stroke(width = 2.1.dp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round)
        when (type) {
            MFNavigationIconType.TODAY -> {
                val p = Path().apply {
                    moveTo(w * .14f, h * .45f); lineTo(w * .50f, h * .16f); lineTo(w * .86f, h * .45f)
                    lineTo(w * .86f, h * .84f); lineTo(w * .59f, h * .84f); lineTo(w * .59f, h * .61f)
                    lineTo(w * .41f, h * .61f); lineTo(w * .41f, h * .84f); lineTo(w * .14f, h * .84f); close()
                }
                drawPath(path = p, color = tint, style = stroke)
            }
            MFNavigationIconType.FUEL -> {
                drawOval(color = tint, topLeft = Offset(w * .22f, h * .15f), size = Size(w * .56f, h * .68f), style = stroke)
                drawLine(tint, Offset(w * .50f, h * .78f), Offset(w * .50f, h * .90f), stroke.width, StrokeCap.Round)
                drawLine(tint, Offset(w * .50f, h * .70f), Offset(w * .66f, h * .39f), stroke.width, StrokeCap.Round)
            }
            MFNavigationIconType.TRAIN -> {
                drawLine(tint, Offset(w * .20f, h * .50f), Offset(w * .80f, h * .50f), stroke.width, StrokeCap.Round)
                drawLine(tint, Offset(w * .20f, h * .31f), Offset(w * .20f, h * .69f), stroke.width, StrokeCap.Round)
                drawLine(tint, Offset(w * .31f, h * .37f), Offset(w * .31f, h * .63f), stroke.width, StrokeCap.Round)
                drawLine(tint, Offset(w * .69f, h * .37f), Offset(w * .69f, h * .63f), stroke.width, StrokeCap.Round)
                drawLine(tint, Offset(w * .80f, h * .31f), Offset(w * .80f, h * .69f), stroke.width, StrokeCap.Round)
            }
            MFNavigationIconType.PROGRESS -> {
                val p = Path().apply {
                    moveTo(w * .15f, h * .76f); lineTo(w * .34f, h * .57f); lineTo(w * .51f, h * .64f)
                    lineTo(w * .69f, h * .37f); lineTo(w * .86f, h * .22f)
                }
                drawPath(path = p, color = tint, style = stroke)
                drawLine(tint, Offset(w * .15f, h * .84f), Offset(w * .86f, h * .84f), stroke.width, StrokeCap.Round)
            }
            MFNavigationIconType.CALENDAR -> {
                val p = Path().apply {
                    moveTo(w * .18f, h * .27f); lineTo(w * .82f, h * .27f); lineTo(w * .82f, h * .84f)
                    lineTo(w * .18f, h * .84f); close()
                }
                drawPath(path = p, color = tint, style = stroke)
                drawLine(tint, Offset(w * .18f, h * .42f), Offset(w * .82f, h * .42f), stroke.width, StrokeCap.Round)
                drawLine(tint, Offset(w * .33f, h * .15f), Offset(w * .33f, h * .32f), stroke.width, StrokeCap.Round)
                drawLine(tint, Offset(w * .67f, h * .15f), Offset(w * .67f, h * .32f), stroke.width, StrokeCap.Round)
            }
            MFNavigationIconType.PROFILE -> {
                drawCircle(color = tint, radius = w * .15f, center = Offset(w * .50f, h * .32f), style = stroke)
                drawArc(
                    color = tint,
                    startAngle = 205f,
                    sweepAngle = 130f,
                    useCenter = false,
                    topLeft = Offset(w * .22f, h * .45f),
                    size = Size(w * .56f, h * .42f),
                    style = stroke,
                )
            }
            MFNavigationIconType.BACK -> {
                val p = Path().apply {
                    moveTo(w * .62f, h * .20f); lineTo(w * .32f, h * .50f); lineTo(w * .62f, h * .80f)
                }
                drawPath(path = p, color = tint, style = stroke)
            }
        }
    }
}
