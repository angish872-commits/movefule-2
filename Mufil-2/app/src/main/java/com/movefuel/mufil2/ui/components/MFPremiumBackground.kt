package com.movefuel.mufil2.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import com.movefuel.mufil2.ui.design.MoveFuelColors

@Composable
fun MFPremiumBackground(
    modifier: Modifier = Modifier,
    content: @Composable BoxScope.() -> Unit,
) {
    Box(
        modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    0f to Color(0xFF101712),
                    .45f to MoveFuelColors.Background,
                    1f to Color(0xFF090D0A),
                )
            )
            .background(
                Brush.radialGradient(
                    colors = listOf(
                        MoveFuelColors.Sage.copy(alpha = .11f),
                        Color.Transparent,
                    ),
                    center = Offset(170f, 0f),
                    radius = 720f,
                )
            ),
        content = content,
    )
}
