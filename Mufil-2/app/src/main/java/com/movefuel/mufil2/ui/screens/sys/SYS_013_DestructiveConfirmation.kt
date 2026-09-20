package com.movefuel.mufil2.ui.screens.sys

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun SYS013DestructiveConfirmationScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "SYS_013",
        title = "Destructive Confirmation",
        subtitle = "Reliability and edge-state UI.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.SYS_014,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.SYS_012,
        onNavigate = onNavigate,
    ) {
            MFNotice("Confirm destructive action","This action cannot be silently reversed.")
            MFField("Confirmation","")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun SYS013DestructiveConfirmationScreenPreview() {
    MoveFuelTheme { SYS013DestructiveConfirmationScreen {} }
}
