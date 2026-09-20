package com.movefuel.mufil2.ui.components

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.design.*

@Composable
fun MFMediaLoading(
    label: String = "Loading exercise media…",
    modifier: Modifier = Modifier,
) {
    val transition = rememberInfiniteTransition(label = "mediaPulse")
    val alpha by transition.animateFloat(
        initialValue = .64f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(900),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "mediaPulseAlpha",
    )
    MFCard(modifier.fillMaxWidth()) {
        Box(
            Modifier
                .fillMaxWidth()
                .height(188.dp)
                .background(
                    Brush.linearGradient(
                        listOf(
                            MoveFuelColors.Surface3,
                            MoveFuelColors.SageStrong.copy(alpha = .22f),
                            MoveFuelColors.Surface3,
                        )
                    ),
                    RoundedCornerShape(MoveFuelRadius.Card),
                ),
            contentAlignment = Alignment.Center,
        ) {
            Column(
                modifier = Modifier.alpha(alpha),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(MoveFuelSpacing.Md),
            ) {
                CircularProgressIndicator(
                    color = MoveFuelColors.Sage,
                    trackColor = MoveFuelColors.Surface2,
                )
                Text(label, color = MoveFuelColors.TextSecondary)
            }
        }
        Spacer(Modifier.height(MoveFuelSpacing.Md))
        MFSkeleton(190.dp, 18.dp)
        Spacer(Modifier.height(MoveFuelSpacing.Sm))
        MFSkeleton(126.dp, 12.dp)
    }
}
